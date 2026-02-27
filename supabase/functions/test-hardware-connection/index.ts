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
    const { siteId } = await req.json();

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: "siteId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select("*")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (hwErr || !hw) {
      return new Response(
        JSON.stringify({ success: false, message: "Aucune intégration matérielle trouvée" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controllerUrl = hw.controller_url.replace(/\/$/, "");
    let success = false;
    let version = "";
    let clientCount = 0;
    let message = "";

    try {
      const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: hw.api_username, password: hw.api_password_enc }),
      });

      if (loginRes.ok) {
        const cookies = loginRes.headers.get("set-cookie") || "";
        const csrfToken = loginRes.headers.get("x-csrf-token") || "";
        const unifiSiteId = hw.unifi_site_id || "default";

        // Get system info
        const sysRes = await fetch(
          `${controllerUrl}/proxy/network/api/s/${unifiSiteId}/stat/sysinfo`,
          {
            headers: { Cookie: cookies, "X-Csrf-Token": csrfToken },
          }
        );

        if (sysRes.ok) {
          const sysData = await sysRes.json();
          version = sysData?.data?.[0]?.version || "unknown";
        }

        // Get active clients count
        const staRes = await fetch(
          `${controllerUrl}/proxy/network/api/s/${unifiSiteId}/stat/sta`,
          {
            headers: { Cookie: cookies, "X-Csrf-Token": csrfToken },
          }
        );

        if (staRes.ok) {
          const staData = await staRes.json();
          clientCount = staData?.data?.length || 0;
        }

        success = true;
        message = `Connexion réussie — ${hw.brand || "ubiquiti"}`;
      } else {
        message = `Échec de connexion: HTTP ${loginRes.status}`;
      }
    } catch (e: any) {
      message = `Erreur réseau: ${e.message}`;
    }

    // Update last test result
    await supabase
      .from("hardware_integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_ok: success,
        last_test_msg: message,
      })
      .eq("id", hw.id);

    return new Response(
      JSON.stringify({
        success,
        brand: hw.brand || "ubiquiti",
        version: version || undefined,
        clientCount: clientCount || undefined,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("test-hardware-connection error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
