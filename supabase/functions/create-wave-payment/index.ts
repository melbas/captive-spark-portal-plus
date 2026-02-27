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
    const { planId, siteId, userId, mac } = await req.json();

    if (!planId || !siteId || !userId || !mac) {
      return new Response(
        JSON.stringify({ error: "planId, siteId, userId, mac requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get plan price
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("price_fcfa, name")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: "Forfait introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get site commission rate
    const { data: site } = await supabase
      .from("sites")
      .select("reseller_id")
      .eq("id", siteId)
      .single();

    let commissionFcfa = 0;
    if (site?.reseller_id) {
      const { data: reseller } = await supabase
        .from("resellers")
        .select("commission_rate")
        .eq("id", site.reseller_id)
        .single();
      if (reseller) {
        commissionFcfa = Math.round(plan.price_fcfa * (reseller.commission_rate / 100));
      }
    }

    // Create pending transaction
    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .insert({
        site_id: siteId,
        user_id: userId,
        plan_id: planId,
        amount_fcfa: plan.price_fcfa,
        commission_fcfa: commissionFcfa,
        method: "wave",
        status: "pending",
      })
      .select("id")
      .single();

    if (txErr || !transaction) {
      console.error("Transaction creation error:", txErr);
      return new Response(
        JSON.stringify({ error: "Erreur création transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Wave API
    const waveSecretKey = Deno.env.get("WAVE_SECRET_KEY");

    if (!waveSecretKey) {
      // Dev mode: return a simulated checkout URL
      console.warn("[DEV] WAVE_SECRET_KEY not configured — returning mock checkout");
      return new Response(
        JSON.stringify({
          checkoutUrl: null,
          transactionId: transaction.id,
          message: "Wave non configuré. Mode démo.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const successUrl = `${supabaseUrl}/functions/v1/wave-webhook?status=success&tx=${transaction.id}`;
    const errorUrl = `${supabaseUrl}/functions/v1/wave-webhook?status=error&tx=${transaction.id}`;

    const waveRes = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${waveSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price_fcfa,
        currency: "XOF",
        success_url: successUrl,
        error_url: errorUrl,
        client_reference: transaction.id,
      }),
    });

    const waveData = await waveRes.json();

    if (!waveRes.ok) {
      console.error("Wave API error:", waveData);
      return new Response(
        JSON.stringify({ error: "Erreur Wave API", details: waveData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with Wave checkout ID
    await supabase
      .from("transactions")
      .update({ wave_checkout_id: waveData.id })
      .eq("id", transaction.id);

    return new Response(
      JSON.stringify({
        checkoutUrl: waveData.wave_launch_url || waveData.checkout_url,
        transactionId: transaction.id,
        sessionId: waveData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-wave-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
