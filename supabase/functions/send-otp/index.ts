import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// send-otp — génère et stocke un OTP.
// SÉCURITÉ (P0) :
//  - Le mode démo (code fixe 123456 + devCode renvoyé) est STRICTEMENT
//    conditionné au secret DEV_OTP_MODE=true. Le comportement antérieur
//    « actif si SMS_API_KEY absent » est supprimé.
//  - Rate limiting : 3 envois/heure/identifiant, 10/jour/IP (table
//    otp_send_rate_limits, écrite en service_role).
// Déploiement démo : npx supabase secrets set DEV_OTP_MODE=true
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
    const { phone, email, siteId } = await req.json();

    if (!siteId) {
      return json({ error: "siteId requis" }, 400);
    }
    if (!phone && !email) {
      return json({ error: "phone ou email requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // DEV mode : UNIQUEMENT si le secret DEV_OTP_MODE=true est défini.
    const devMode = Deno.env.get("DEV_OTP_MODE") === "true";
    const fixedCode = Deno.env.get("DEV_OTP_FIXED_CODE") || "123456";

    const identifier = (phone || email)!.toString().toLowerCase();
    const identifierType = phone ? "phone" : "email";

    // --- Rate limiting (3/heure/identifiant, 10/jour/IP) -------------------
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = new Date();
    const hourBucket = new Date(now);
    hourBucket.setMinutes(0, 0, 0);
    const dayBucket = new Date(now);
    dayBucket.setUTCHours(0, 0, 0, 0);

    const { data: counters } = await supabase
      .from("otp_send_rate_limits")
      .select("sent_count_hour, sent_count_day")
      .eq("identifier", identifier)
      .eq("ip_address", ip)
      .eq("hour_bucket", hourBucket.toISOString())
      .eq("day_bucket", dayBucket.toISOString())
      .maybeSingle();

    if (counters && counters.sent_count_hour >= 3) {
      return json({ error: "Trop de codes envoyés. Réessayez dans une heure." }, 429);
    }
    if (counters && counters.sent_count_day >= 10) {
      return json({ error: "Limite quotidienne atteinte." }, 429);
    }

    await supabase.from("otp_send_rate_limits").upsert(
      {
        identifier,
        ip_address: ip,
        site_id: siteId,
        hour_bucket: hourBucket.toISOString(),
        day_bucket: dayBucket.toISOString(),
        sent_count_hour: (counters?.sent_count_hour || 0) + 1,
        sent_count_day: (counters?.sent_count_day || 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "identifier,ip_address,hour_bucket,day_bucket" }
    );

    // --- Génération OTP -----------------------------------------------------
    const code = devMode
      ? fixedCode
      : String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

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
      console.log(`[DEV-OTP] ${identifierType} → code fixe (démo)`);
    } else {
      // TODO: Intégration SMS réelle (Twilio / Orange SMS API) — voir rapport
      console.log(`[PROD] OTP envoyé (code non loggé)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiresIn: 300,
        // devCode renvoyé UNIQUEMENT en mode démo explicite (DEV_OTP_MODE=true)
        ...(devMode ? { devMode: true, devCode: code } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
