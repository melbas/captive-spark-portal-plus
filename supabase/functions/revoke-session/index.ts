import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { decryptSecret } from "../_shared/crypto.ts";

// ---------------------------------------------------------------------------
// revoke-session — révocation d'une session WiFi (UniFi unauthorize-sta).
// SÉCURITÉ (P0) :
//  - Appelant : secret interne OU admin authentifié sur le périmètre du site
//    de la session (JWT anon refusé) OU le visiteur propriétaire de la session.
//  - Mot de passe UniFi déchiffré à l'usage (ENCRYPTION_KEY).
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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session (colonnes ciblées)
    const { data: session } = await supabase
      .from("wifi_sessions")
      .select("id, site_id, user_id, mac_address, hardware_integrations(controller_url, unifi_site_id, api_username, api_password_enc, is_active)")
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

    // Revoke on UniFi if hardware exists
    const hw = session.hardware_integrations as any;
    if (hw?.is_active) {
      if (!Deno.env.get("ENCRYPTION_KEY")) {
        return json({ error: "ENCRYPTION_KEY absente — révocation matérielle impossible" }, 503);
      }
      try {
        const controllerUrl = hw.controller_url.replace(/\/$/, "");
        const password = await decryptSecret(hw.api_password_enc);
        const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: hw.api_username, password }),
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
      } catch (e) {
        console.error("UniFi revoke error:", (e as Error).message);
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

    return json({ success: true }, 200);
  } catch (err) {
    console.error("revoke-session error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
