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

    // Generate a 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Store OTP in a simple approach: upsert into a temporary table or use Supabase Auth OTP
    // For now, store in a lightweight way using the wifi_users table + a separate OTP store
    // We'll use Supabase's built-in cache via a dedicated table approach
    // Since we want to keep it simple, store OTP hashed in memory via KV-like approach

    // Store OTP: use a simple insert into a dedicated structure
    // For MVP: store in pc_audit_logs as a secure OTP record (temporary approach)
    // Better: create a small OTP tracking mechanism

    const identifier = phone || email;
    const identifierType = phone ? "phone" : "email";

    // Delete any existing OTP for this identifier
    await supabase
      .from("pc_audit_logs")
      .delete()
      .eq("action", "otp_pending")
      .eq("entity_type", identifierType)
      .eq("ip_address", identifier);

    // Store new OTP (using audit_logs as temporary OTP store)
    await supabase.from("pc_audit_logs").insert({
      action: "otp_pending",
      entity_type: identifierType,
      ip_address: identifier,
      entity_id: siteId,
      details: { code, expires_at: expiresAt, attempts: 0 },
    });

    // In production: send SMS via Twilio/Orange SMS API or email via Resend
    // For now, log the OTP (dev mode)
    console.log(`[DEV] OTP for ${identifier}: ${code}`);

    // TODO: Integrate SMS_API_KEY for real SMS sending
    // const smsApiKey = Deno.env.get("SMS_API_KEY");

    return new Response(
      JSON.stringify({ success: true, expiresIn: 300 }),
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

