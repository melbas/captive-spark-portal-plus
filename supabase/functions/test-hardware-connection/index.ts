import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { testConnection, type UniFiIntegration } from "../_shared/unifi.ts";

// ---------------------------------------------------------------------------
// test-hardware-connection — outil de diagnostic admin.
// SÉCURITÉ (P0) :
//  - Appelant : admin authentifié UNIQUEMENT (JWT vérifié + is_super_admin()
//    ou can_access_site(siteId)) OU secret interne. JWT anon refusé.
//  - Clé API / mot de passe déchiffrés à l'usage (ENCRYPTION_KEY).
//  - select() ciblé.
//
// Comportement :
//  - cloud_connector : GET /v1/hosts (consoles atteignables avec la clé) +
//    clients connectés du site. Valide console_id, site_id et la portée de
//    la clé — sans rien modifier.
//  - local (legacy)  : stat/sysinfo + stat/sta.
//  - Aucune intégration : retourne success=false, pas une erreur.
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
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );

    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select(
        "id, brand, connection_mode, controller_url, unifi_site_id, " +
        "api_username, api_password_enc, console_id, api_key_enc"
      )
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

    let result;
    try {
      result = await testConnection(hw as unknown as UniFiIntegration);
    } catch (e) {
      result = {
        success: false,
        message: "Erreur: " + (e as Error).message,
      };
    }

    // Enregistre le résultat du test
    await supabase
      .from("hardware_integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_ok: result.success,
        last_test_msg: result.message,
      })
      .eq("id", hw.id);

    return json(
      {
        success: result.success,
        brand: hw.brand || "ubiquiti",
        connectionMode: hw.connection_mode,
        version: result.version,
        clientCount: result.clientCount,
        consoleCount: result.consoleCount,
        message: result.message,
      },
      200
    );
  } catch (err) {
    console.error("test-hardware-connection error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
