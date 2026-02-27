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
    const { planId, siteId, userId, phone, mac } = await req.json();

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

    const { data: plan } = await supabase
      .from("wifi_plans")
      .select("price_fcfa, name")
      .eq("id", planId)
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Forfait introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending transaction
    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .insert({
        site_id: siteId,
        user_id: userId,
        plan_id: planId,
        amount_fcfa: plan.price_fcfa,
        method: "orange_money",
        status: "pending",
      })
      .select("id")
      .single();

    if (txErr) {
      return new Response(
        JSON.stringify({ error: "Erreur création transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Orange Money API integration
    const omApiKey = Deno.env.get("ORANGE_MONEY_API_KEY");

    if (!omApiKey) {
      console.warn("[DEV] ORANGE_MONEY_API_KEY not configured — returning mock");
      return new Response(
        JSON.stringify({
          paymentUrl: null,
          transactionId: transaction!.id,
          message: "Orange Money non configuré. Mode démo.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Implement actual Orange Money API v2 Sénégal call
    return new Response(
      JSON.stringify({
        paymentUrl: null,
        transactionId: transaction!.id,
        message: "Orange Money intégration en cours.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-om-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
