import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { unauthorizeGuest, type UniFiIntegration } from "../_shared/unifi.ts";

// ---------------------------------------------------------------------------
// revoke-session — révocation d'une session WiFi (UniFi unauthorize).
// SÉCURITÉ (P0) :
//  - Appelant : secret interne OU admin authentifié sur le périmètre du site
//    de la session (JWT anon refusé) OU le visiteur propriétaire de la
//    session. La requête est résolue APRÈS lookup du site (le visiteur ne
//    connaît que son sessionId).
//  - Mode Cloud Connector : POST .../clients/{clientId}/actions
//    { "action": "UNAUTHORIZE_GUEST_ACCESS" }
//  - Mode local legacy : cmd/stamgr { cmd: "unauthorize-sta", mac }
//  - Clé API / mot de passe déchiffrés à l'usage (ENCRYPTION_KEY).
//  - select() ciblé (plus de select * / join *).
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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return json({ error: "sessionId requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );

    // Récupère la session + l'intégration matérielle (colonnes ciblées)
    const { data: session } = await supabase
      .from("wifi_sessions")
      .select(
        "id, site_id, user_id, mac_address, " +
        "hardware_integrations(id, connection_mode, controller_url, unifi_site_id, " +
        "api_username, api_password_enc, console_id, api_key_enc, is_active)"
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return json({ error: "Session introuvable" }, 404);
    }

    // --- Authentification + autorisation serveur (après lookup du site) ----
    const auth = await requireAuth(req, { siteId: session.site_id, allowVisitor: true });
    if ("error" in auth) return auth.error;
    const ctx = auth.ctx;
    if (ctx.kind === "visitor" && ctx.userId !== session.user_id) {
      return json({ error: "Périmètre refusé" }, 403);
    }

    // Révoque sur UniFi si une intégration active existe
    const hw = session.hardware_integrations as unknown as UniFiIntegration | null;
    let unifiSuccess = false;
    let unifiMessage = "";

    if (hw) {
      if (!Deno.env.get("ENCRYPTION_KEY")) {
        return json(
          { error: "ENCRYPTION_KEY absente — révocation matérielle impossible" },
          503
        );
      }
      try {
        const res = await unauthorizeGuest(hw, session.mac_address);
        unifiSuccess = res.success;
        unifiMessage = res.message;
      } catch (e) {
        unifiMessage = "UniFi error: " + (e as Error).message;
        console.error("UniFi revoke error:", (e as Error).message);
      }
    }

    // Marque la session révoquée
    await supabase
      .from("wifi_sessions")
      .update({ status: "revoked", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    await supabase.from("pc_audit_logs").insert({
      action: "revoke_session",
      entity_type: "wifi_session",
      entity_id: sessionId,
      details: { unifiSuccess, unifiMessage },
    });

    return json({ success: true }, 200);
  } catch (err) {
    console.error("revoke-session error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
