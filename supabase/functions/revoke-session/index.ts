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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session, error: sessErr } = await supabase
      .from("wifi_sessions")
      .select("*, sites!inner(id), hardware_integrations!inner(*)")
      .eq("id", sessionId)
      .single();

    // Revoke on UniFi if hardware exists
    if (session?.hardware_integrations) {
      const hw = session.hardware_integrations as any;
      try {
        const controllerUrl = hw.controller_url.replace(/\/$/, "");
        const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: hw.api_username, password: hw.api_password_enc }),
        });

        if (loginRes.ok) {
          const cookies = loginRes.headers.get("set-cookie") || "";
          const csrfToken = loginRes.headers.get("x-csrf-token") || "";

          await fetch(
            `${controllerUrl}/proxy/network/api/s/${hw.unifi_site_id || "default"}/cmd/stamgr`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: cookies,
                "X-Csrf-Token": csrfToken,
              },
              body: JSON.stringify({
                cmd: "unauthorize-sta",
                mac: session.mac_address,
              }),
            }
          );
        }
      } catch (e: any) {
        console.error("UniFi revoke error:", e.message);
      }
    }

    // Update session status
    await supabase
      .from("wifi_sessions")
      .update({ status: "revoked", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    await supabase.from("pc_audit_logs").insert({
      action: "revoke_session",
      entity_type: "wifi_session",
      entity_id: sessionId,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("revoke-session error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
