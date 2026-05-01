import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, email, code, siteId } = await req.json();

    if (!siteId || !code) {
      return new Response(JSON.stringify({ error: "siteId et code requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const identifier = phone || email;
    const identifierType = phone ? "phone" : "email";

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: "phone ou email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ⚠️ BYPASS DÉMO/TEST — code universel 123456 accepté
    // À retirer en production stricte
    const isDemoCode = code === "123456";

    // Retrieve stored OTP
    const { data: otpRecord, error: otpErr } = await supabase
      .from("pc_audit_logs")
      .select("*")
      .eq("action", "otp_pending")
      .eq("entity_type", identifierType)
      .eq("ip_address", identifier)
      .eq("entity_id", siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if ((otpErr || !otpRecord) && !isDemoCode) {
      return new Response(
        JSON.stringify({ error: "Aucun code en attente. Renvoyez un code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const details = (otpRecord?.details as any) || {};

    if (!isDemoCode) {
      // Check expiration
      if (new Date() > new Date(details.expires_at)) {
        await supabase.from("pc_audit_logs").delete().eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "Code expiré. Renvoyez un nouveau code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check attempts
      if ((details.attempts || 0) >= 5) {
        await supabase.from("pc_audit_logs").delete().eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "Trop de tentatives. Renvoyez un nouveau code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify code
      if (details.code !== code) {
        await supabase
          .from("pc_audit_logs")
          .update({
            details: { ...details, attempts: (details.attempts || 0) + 1 },
          })
          .eq("id", otpRecord.id);

        const remaining = 5 - ((details.attempts || 0) + 1);
        return new Response(
          JSON.stringify({ error: `Code incorrect. ${remaining} tentative(s) restante(s).` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // OTP valid (or demo bypass) — delete it if it exists
    if (otpRecord?.id) {
      await supabase.from("pc_audit_logs").delete().eq("id", otpRecord.id);
    }

    // Find or create wifi_user
    const userFilter = identifierType === "phone"
      ? { phone: identifier, site_id: siteId }
      : { email: identifier, site_id: siteId };

    let { data: existingUser } = await supabase
      .from("wifi_users")
      .select("id")
      .match(userFilter)
      .single();

    let isNew = false;

    if (!existingUser) {
      isNew = true;
      // Generate referral code
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const insertData = identifierType === "phone"
        ? { phone: identifier, site_id: siteId, referral_code: referralCode }
        : { email: identifier, site_id: siteId, referral_code: referralCode };

      const { data: newUser, error: insertErr } = await supabase
        .from("wifi_users")
        .insert(insertData)
        .select("id")
        .single();

      if (insertErr) {
        console.error("Error creating user:", insertErr);
        return new Response(
          JSON.stringify({ error: "Erreur lors de la création du compte" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      existingUser = newUser;
    }

    return new Response(
      JSON.stringify({ success: true, userId: existingUser!.id, isNew }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
