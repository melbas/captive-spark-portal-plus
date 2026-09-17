import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { decryptSecret } from "../_shared/crypto.ts";

// ---------------------------------------------------------------------------
// test-hardware-connection — outil de diagnostic admin.
// SÉCURITÉ (P0) :
//  - Appelant : admin authentifié UNIQUEMENT (JWT vérifié + is_super_admin()
//    ou can_access_site(siteId)) OU secret interne. JWT anon refusé.
//  - Mot de passe UniFi déchiffré à l'usage (ENCRYPTION_KEY).
//  - select() ciblé.
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteId } = await req.json();

    if (!siteId) {
      return json({ error: "siteId requis" }, 400);
    }

    // --- Authentification + autorisation serveur (admin ou interne) --------
    const auth = await requireAuth(req, { siteId });
    if ("error" in auth) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select("id, brand, controller_url, unifi_site_id, api_username, api_password_enc")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (hwErr || !hw) {
      return json({ success: false, message: "Aucune intégration matérielle trouvée" }, 200);
    }

    if (!Deno.env.get("ENCRYPTION_KEY")) {
      return json({ error: "ENCRYPTION_KEY absente — test matériel impossible" }, 503);
    }

    const controllerUrl = hw.controller_url.replace(/\/$/, "");
    let success = false;
    let version = "";
    let clientCount = 0;
    let message = "";

    try {
      const password = await decryptSecret(hw.api_password_enc);
      const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: hw.api_username, password }),
      });

      if (loginRes.ok) {
        const cookies = loginRes.headers.get("set-cookie") || "";
        const csrfToken = loginRes.headers.get("x-csrf-token") || "";
        const unifiSiteId = hw.unifi_site_id || "default";

        // Get system info
        const sysRes = await fetch(
          `${controllerUrl}/proxy/network/api/s/${unifiSiteId}/stat/sysinfo`,
          { headers: { Cookie: cookies, "X-Csrf-Token": csrfToken } }
        );

        if (sysRes.ok) {
          const sysData = await sysRes.json();
          version = sysData?.data?.[0]?.version || "unknown";
        }

        // Get active clients count
        const staRes = await fetch(
          `${controllerUrl}/proxy/network/api/s/${unifiSiteId}/stat/sta`,
          { headers: { Cookie: cookies, "X-Csrf-Token": csrfToken } }
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
    } catch (e) {
      message = `Erreur réseau: ${(e as Error).message}`;
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
  } catch (err) {
    console.error("test-hardware-connection error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
