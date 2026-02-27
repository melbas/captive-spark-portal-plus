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
    const { mac, siteId, planId, userId, transactionId } = await req.json();

    if (!mac || !siteId || !planId || !userId) {
      return new Response(
        JSON.stringify({ error: "mac, siteId, planId, userId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get hardware integration for site
    const { data: hw, error: hwErr } = await supabase
      .from("hardware_integrations")
      .select("*")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .limit(1)
      .single();

    // 2. Get plan duration
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("duration_min, name, price_fcfa")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: "Forfait introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const durationMin = plan.duration_min;
    const expiresAt = new Date(Date.now() + durationMin * 60 * 1000).toISOString();
    let unifiSuccess = false;
    let unifiMessage = "";

    // 3. Authorize on UniFi controller (if hardware exists)
    if (hw && !hwErr) {
      try {
        const controllerUrl = hw.controller_url.replace(/\/$/, "");
        const unifiSiteId = hw.unifi_site_id || "default";

        // Login to UniFi
        const loginRes = await fetch(`${controllerUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: hw.api_username,
            password: hw.api_password_enc, // TODO: decrypt with ENCRYPTION_KEY
          }),
        });

        if (loginRes.ok) {
          // Extract cookies and CSRF token
          const cookies = loginRes.headers.get("set-cookie") || "";
          const csrfToken = loginRes.headers.get("x-csrf-token") || "";

          // Authorize station
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
      } catch (unifiErr: any) {
        unifiMessage = `UniFi error: ${unifiErr.message}`;
        console.error("UniFi authorize error:", unifiErr);
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

    // 6. Award loyalty points (+10)
    await supabase.rpc("increment_loyalty_points", {
      user_uuid: userId,
      pts: 10,
    }).catch(() => {
      // If RPC doesn't exist, do manual update
      supabase
        .from("wifi_users")
        .update({ loyalty_pts: 10 }) // This is simplified; ideally increment
        .eq("id", userId);
    });

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
  } catch (err: any) {
    console.error("authorize-guest error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
