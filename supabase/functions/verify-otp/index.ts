import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// verify-otp — vérifie l'OTP et retourne l'identité visiteur.
// SÉCURITÉ (P0) : le code démo 123456 n'est accepté QUE si le secret
// DEV_OTP_MODE=true est défini sur la fonction. Sinon il est rejeté comme
// n'importe quel mauvais code. En mode démo la réponse porte demo:true —
// authorize-guest REFUSE alors d'autoriser du matériel UniFi réel.
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, email, code, siteId } = await req.json();

    if (!siteId || !code) {
      return json({ error: "siteId et code requis" }, 400);
    }

    const identifier = phone || email;
    const identifierType = phone ? "phone" : "email";

    if (!identifier) {
      return json({ error: "phone ou email requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Bypass démo UNIQUEMENT via secret — plus aucun comportement par défaut
    const isDemoCode =
      Deno.env.get("DEV_OTP_MODE") === "true" && code === "123456";

    // Retrieve stored OTP (colonnes nécessaires uniquement — plus de select *)
    const { data: otpRecord, error: otpErr } = await supabase
      .from("pc_audit_logs")
      .select("id, details")
      .eq("action", "otp_pending")
      .eq("entity_type", identifierType)
      .eq("ip_address", identifier)
      .eq("entity_id", siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((otpErr || !otpRecord) && !isDemoCode) {
      return json(
        { error: "Aucun code en attente. Renvoyez un code." },
        400
      );
    }

    const details = (otpRecord?.details as any) || {};

    if (!isDemoCode) {
      if (new Date() > new Date(details.expires_at)) {
        await supabase.from("pc_audit_logs").delete().eq("id", otpRecord!.id);
        return json({ error: "Code expiré. Renvoyez un nouveau code." }, 400);
      }

      if ((details.attempts || 0) >= 5) {
        await supabase.from("pc_audit_logs").delete().eq("id", otpRecord!.id);
        return json(
          { error: "Trop de tentatives. Renvoyez un nouveau code." },
          400
        );
      }

      if (details.code !== code) {
        await supabase
          .from("pc_audit_logs")
          .update({
            details: { ...details, attempts: (details.attempts || 0) + 1 },
          })
          .eq("id", otpRecord!.id);

        const remaining = 5 - ((details.attempts || 0) + 1);
        return json(
          { error: `Code incorrect. ${remaining} tentative(s) restante(s).` },
          400
        );
      }
    }

    // OTP valid (or demo bypass) — delete it if it exists
    if (otpRecord?.id) {
      await supabase.from("pc_audit_logs").delete().eq("id", otpRecord.id);
    }

    // Find or create wifi_user (service_role — le front n'écrit plus direct)
    const userFilter = identifierType === "phone"
      ? { phone: identifier, site_id: siteId }
      : { email: identifier, site_id: siteId };

    let { data: existingUser } = await supabase
      .from("wifi_users")
      .select("id, is_blocked")
      .match(userFilter)
      .maybeSingle();

    let isNew = false;

    if (!existingUser) {
      isNew = true;
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const insertData: Record<string, unknown> = {
        site_id: siteId,
        auth_method: identifierType,
        referral_code: referralCode,
        loyalty_pts: 0,
        is_blocked: false,
      };
      insertData[identifierType] = identifier;

      const { data: newUser, error: insertErr } = await supabase
        .from("wifi_users")
        .insert(insertData)
        .select("id")
        .single();

      if (insertErr) {
        console.error("Error creating user:", insertErr);
        return json({ error: "Erreur lors de la création du compte" }, 500);
      }
      existingUser = { ...newUser, is_blocked: false };
    }

    if (existingUser.is_blocked) {
      return json({ error: "Compte bloqué" }, 403);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: existingUser.id,
        siteId,
        isNew,
        demo: isDemoCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-otp error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
