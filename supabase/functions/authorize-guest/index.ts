import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { decryptSecret } from "../_shared/crypto.ts";

// ---------------------------------------------------------------------------
// authorize-guest — autorise un client sur le contrôleur UniFi et crée la
// session wifi.
// SÉCURITÉ (P0) :
//  - Appelant : secret interne (x-internal-secret, utilisé par wave-webhook)
//    OU admin authentifié (JWT vérifié + is_super_admin()/can_access_site()).
//    verify_jwt seul ne suffit pas (il accepte le JWT anon) → autorisation
//    réelle côté serveur ici.
//  - Mot de passe UniFi DÉCHIFFRÉ au moment de l'usage (AES-GCM,
//    ENCRYPTION_KEY) — plus d'utilisation de api_password_enc en clair.
//  - select() ciblé sur hardware_integrations (plus de select *).
//  - Fidélité : RPC increment_loyalty_pts atomique, plus de fallback écrasant.
//  - Session démo (OTP 123456) : refuse d'autoriser du matériel UniFi réel.
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
    const { mac, siteId, planId, userId, transactionId, demo } = await req.json();

    if (!mac || !siteId || !planId || !userId) {
      return json({ error: "mac, siteId, planId, userId requis" }, 400);
    }

    // --- Authentification + autorisation serveur ---------------------------
    const auth = await requireAuth(req, { siteId, allowVisitor: true });
    if ("error" in auth) return auth.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Le visiteur ne peut autoriser que sa propre session (preuve de session
    // visiteur liée au site) — l'admin peut pour n'importe qui.
    const ctx = auth.ctx;
    if (ctx.kind === "visitor" && ctx.userId !== userId) {
      return json({ error: "Périmètre refusé" }, 403);
    }

    // 1. Get hardware integration for site (colonnes ciblées)
    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select("id, brand, controller_url, unifi_site_id, api_username, api_password_enc")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // 2. Get plan duration
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("duration_min, name, price_fcfa")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      return json({ error: "Forfait introuvable" }, 404);
    }

    const durationMin = plan.duration_min;
    const expiresAt = new Date(Date.now() + durationMin * 60 * 1000).toISOString();
    let unifiSuccess = false;
    let unifiMessage = "";

    // 3. Authorize on UniFi controller (if hardware exists)
    if (hw && !hwErr) {
      if (demo === true && Deno.env.get("DEV_OTP_MODE") === "true") {
        // Session démo : JAMAIS de matériel réel — isolation démo/réseau.
        unifiSuccess = true;
        unifiMessage = "Demo session — UniFi authorization skipped (no real hardware touched)";
      } else if (!Deno.env.get("ENCRYPTION_KEY")) {
        return json({ error: "ENCRYPTION_KEY absente — autorisation matérielle impossible" }, 503);
      } else {
        try {
          const controllerUrl = hw.controller_url.replace(/\/$/, "");
          const unifiSiteId = hw.unifi_site_id || "default";
          const password = await decryptSecret(hw.api_password_enc);

          const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: hw.api_username,
              password,
            }),
          });

          if (loginRes.ok) {
            const cookies = loginRes.headers.get("set-cookie") || "";
            const csrfToken = loginRes.headers.get("x-csrf-token") || "";

            const authRes = await fetch(
              `${controllerUrl}/proxy/network/api/s/${unifiSiteId}/cmd/stamgr`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: cookies,
                  "X-Csrf-Token": csrfToken,
                },
                body: JSON.stringify({
                  cmd: "authorize-sta",
                  mac: mac.toLowerCase(),
                  minutes: durationMin,
                }),
              }
            );

            const authData = await authRes.json();
            unifiSuccess = authData?.meta?.rc === "ok";
            unifiMessage = unifiSuccess ? "Authorized" : JSON.stringify(authData);
          } else {
            unifiMessage = `UniFi login failed: ${loginRes.status}`;
          }
        } catch (unifiErr) {
          unifiMessage = `UniFi error: ${(unifiErr as Error).message}`;
          console.error("UniFi authorize error:", unifiErr);
        }
      }
    } else {
      // No hardware configured — demo/dev mode, proceed anyway
      unifiSuccess = true;
      unifiMessage = "No hardware configured — demo mode";
    }

    // 4. Create wifi_session
    const { data: session, error: sessionErr } = await supabase
      .from("wifi_sessions")
      .insert({
        site_id: siteId,
        user_id: userId,
        plan_id: planId,
        mac_address: mac.toLowerCase(),
        expires_at: expiresAt,
        status: "active",
      })
      .select("id")
      .single();

    if (sessionErr) {
      console.error("Session creation error:", sessionErr);
    }

    // 5. Update transaction if provided
    if (transactionId) {
      await supabase
        .from("transactions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          session_id: session?.id,
        })
        .eq("id", transactionId);
    }

    // 6. Award loyalty points (+10) — RPC atomique SECURITY DEFINER,
    //    plus aucun fallback qui écrase loyalty_pts.
    const { error: loyaltyErr } = await supabase.rpc("increment_loyalty_pts", {
      p_user_id: userId,
      p_pts: 10,
    });
    if (loyaltyErr) {
      console.error("Loyalty increment error:", loyaltyErr.message);
    }

    // 7. Log in audit
    await supabase.from("pc_audit_logs").insert({
      action: "authorize_guest",
      entity_type: "wifi_session",
      entity_id: session?.id,
      details: {
        mac,
        planId,
        userId,
        unifiSuccess,
        unifiMessage,
        durationMin,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt,
        sessionId: session?.id || null,
        unifiAuthorized: unifiSuccess,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("authorize-guest error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
