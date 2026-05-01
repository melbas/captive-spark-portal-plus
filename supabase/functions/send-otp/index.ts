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
    const { phone, email, siteId } = await req.json();

    if (!siteId) {
      return new Response(JSON.stringify({ error: "siteId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "phone ou email requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // DEV mode: active tant qu'aucun provider SMS n'est configuré, ou si DEV_OTP_MODE=true
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const devModeFlag = Deno.env.get("DEV_OTP_MODE");
    const devMode = devModeFlag === "true" || (devModeFlag !== "false" && !smsApiKey);
    const fixedCode = Deno.env.get("DEV_OTP_FIXED_CODE") || "123456";

    // Generate OTP (fixed in DEV for easier testing)
    const code = devMode
      ? fixedCode
      : String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const identifier = phone || email;
    const identifierType = phone ? "phone" : "email";

    // Delete any existing OTP for this identifier
    await supabase
      .from("pc_audit_logs")
      .delete()
      .eq("action", "otp_pending")
      .eq("entity_type", identifierType)
      .eq("ip_address", identifier);

    // Store new OTP
    await supabase.from("pc_audit_logs").insert({
      action: "otp_pending",
      entity_type: identifierType,
      ip_address: identifier,
      entity_id: siteId,
      details: { code, expires_at: expiresAt, attempts: 0 },
    });

    if (devMode) {
      console.log(`[DEV-OTP] ${identifier} → code: ${code}`);
    } else {
      // TODO: Intégration SMS réelle (Twilio / Orange SMS API)
      console.log(`[PROD] OTP sent to ${identifier}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiresIn: 300,
        // En DEV uniquement : on renvoie le code pour faciliter les tests
        ...(devMode ? { devMode: true, devCode: code } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
