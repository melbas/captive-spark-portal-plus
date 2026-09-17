import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// create-wave-payment — Edge Function HISTORIQUE (Wave direct).
//
// DURCISSEMENT (RAPPORT-BACKEND §7.1) :
//   1. identité de l'appelant vérifiée serveur (JWT + _shared/auth.ts :
//      is_admin_user()/can_access_site(), ou preuve de session visiteur issue
//      de verify-otp) — un visiteur ne peut payer que pour lui-même ;
//   2. montant TOUJOURS relu en base (wifi_plans.price_fcfa), et le forfait
//      doit appartenir au site + être actif — jamais confiance au client ;
//   3. URLs succès/erreur construites côté serveur (déjà le cas) ;
//   4. idempotence : `idempotencyKey` rejoue la transaction existante.
//
// ⚠️ DEPRECATED : `create-charge` est le point d'entrée recommandé
// (provider-agnostic, Bictorys principal). Cette route est conservée pour le
// front existant (src/components/portal/PortalPayment.tsx) — le front doit
// migrer vers create-charge. NE PAS l'utiliser pour de nouveaux dev.
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { planId, siteId, userId, mac, idempotencyKey } = body;

    if (!planId || !siteId || !userId) {
      return json({ error: "planId, siteId, userId requis" }, 400);
    }

    // 1. IDENTITÉ — visiteur (preuve de session issue de verify-otp) ou admin.
    const authResult = await requireAuth(req, { siteId, allowVisitor: true });
    if ("error" in authResult) return authResult.error;
    const { ctx } = authResult;

    // Un visiteur ne peut créer une charge que pour lui-même.
    if (ctx.kind === "visitor" && ctx.userId !== userId) {
      return json({ error: "Un visiteur ne peut payer que pour sa propre session" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. MONTANT — relu en base, jamais confiance au client.
    //    Le forfait doit appartenir au site et être actif.
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("id, site_id, price_fcfa, name, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planErr || !plan) {
      return json({ error: "Forfait introuvable" }, 404);
    }
    if (plan.site_id !== siteId) {
      return json({ error: "Forfait n'appartient pas à ce site" }, 403);
    }
    if (plan.is_active === false) {
      return json({ error: "Forfait inactif" }, 403);
    }

    const amount = Math.round(Number(plan.price_fcfa) || 0);
    if (!Number.isInteger(amount) || amount < 100) {
      return json({ error: "Montant forfait invalide (entier FCFA >= 100)" }, 500);
    }

    // 3. IDEMPOTENCE — une même clé renvoie la transaction existante.
    const paymentReference: string = idempotencyKey || `pc-${crypto.randomUUID()}`;
    if (idempotencyKey) {
      const { data: replay } = await supabase
        .from("transactions")
        .select("id, status, provider_transaction_id, provider_payment_reference")
        .eq("site_id", siteId)
        .eq("plan_id", planId)
        .eq("provider_payment_reference", idempotencyKey)
        .maybeSingle();
      if (replay) {
        return json(
          {
            checkoutUrl: null,
            transactionId: replay.id,
            paymentReference: replay.provider_payment_reference ?? null,
            status: replay.status,
            replayed: true,
          },
          200,
        );
      }
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
        .maybeSingle();
      if (reseller) {
        commissionFcfa = Math.round(amount * (reseller.commission_rate / 100));
      }
    }

    // Create pending transaction
    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .insert({
        site_id: siteId,
        user_id: userId,
        plan_id: planId,
        amount,
        amount_fcfa: amount,
        commission_fcfa: commissionFcfa,
        method: "wave",
        status: "pending",
        provider: "wave",
        provider_payment_reference: paymentReference,
      })
      .select("id")
      .single();

    if (txErr || !transaction) {
      console.error("Transaction creation error:", txErr);
      return json({ error: "Erreur création transaction" }, 500);
    }

    // Audit — MAC conservée pour authorize-guest post-webhook (wave-webhook
    // relit ce log pour récupérer la MAC du client).
    await supabase.from("pc_audit_logs").insert({
      action: "payment_initiated",
      entity_type: "transaction",
      entity_id: transaction.id,
      details: { provider: "wave", method: "wave", amount, mac: mac || "unknown" },
    });

    // Call Wave API
    const waveSecretKey = Deno.env.get("WAVE_SECRET_KEY");

    if (!waveSecretKey) {
      // Fail-closed : on NE simule plus un succès de paiement.
      // La transaction reste pending (un webhook ou un paiement réel la
      // résoudra). Le front affiche "Wave non configuré" sans débloquer
      // l'accès Internet.
      console.warn("[wave] WAVE_SECRET_KEY absent — transaction laissée pending");
      return json(
        {
          checkoutUrl: null,
          transactionId: transaction.id,
          paymentReference,
          message: "Wave non configuré. Mode démo.",
          status: "pending",
        },
        200,
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
      .update({
        wave_checkout_id: waveData.id,
        provider_transaction_id: waveData.id,
      })
      .eq("id", transaction.id);

    return json(
      {
        checkoutUrl: waveData.wave_launch_url || waveData.checkout_url,
        transactionId: transaction.id,
        paymentReference,
        sessionId: waveData.id,
        providerTransactionId: waveData.id,
        status: "processing",
      },
      200,
    );
  } catch (err: any) {
    console.error("create-wave-payment error:", err);
    return json({ error: err.message || "Erreur interne" }, 500);
  }
});
