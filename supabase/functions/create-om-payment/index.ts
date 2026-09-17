import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// create-om-payment — Edge Function HISTORIQUE (Orange Money direct).
//
// DURCISSEMENT (RAPPORT-BACKEND §7.1) :
//   1. identité de l'appelant vérifiée serveur (JWT + _shared/auth.ts :
//      is_admin_user()/can_access_site(), ou preuve de session visiteur issue
//      de verify-otp) — un visiteur ne peut payer que pour lui-même ;
//   2. montant TOUJOURS relu en base (wifi_plans.price_fcfa), forfait
//      appartenant au site et actif — jamais confiance au client ;
//   3. idempotence : `idempotencyKey` rejoue la transaction existante.
//
// ⚠️ DEPRECATED : `create-charge` est le point d'entrée recommandé
// (provider-agnostic, Bictorys principal). Orange Money direct n'est de toute
// façon PAS implémenté (voir provider orange — fail-closed) : en pratique OM
// passe par Bictorys (payment_type=orange_money) qui renvoie le code USSD à
// afficher. NE PAS utiliser cette route pour de nouveaux développements.
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
    const { planId, siteId, userId, mac, phone, idempotencyKey } = body;

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
    const { data: plan } = await supabase
      .from("wifi_plans")
      .select("id, site_id, price_fcfa, name, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
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
            paymentUrl: null,
            transactionId: replay.id,
            paymentReference: replay.provider_payment_reference ?? null,
            status: replay.status,
            replayed: true,
          },
          200,
        );
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
        method: "orange_money",
        status: "pending",
        provider: "orange",
        provider_payment_reference: paymentReference,
      })
      .select("id")
      .single();

    if (txErr) {
      return json({ error: "Erreur création transaction" }, 500);
    }

    // Audit — MAC conservée pour authorize-guest post-webhook.
    await supabase.from("pc_audit_logs").insert({
      action: "payment_initiated",
      entity_type: "transaction",
      entity_id: transaction!.id,
      details: { provider: "orange", method: "orange_money", amount, mac: mac || "unknown" },
    });

    // Orange Money API integration
    const omApiKey = Deno.env.get("ORANGE_MONEY_API_KEY");

    if (!omApiKey) {
      // Fail-closed : on NE simule plus un succès de paiement.
      // La transaction reste pending — l'accès Internet n'est pas débloqué.
      console.warn("[om] ORANGE_MONEY_API_KEY absent — transaction laissée pending");
      return json(
        {
          paymentUrl: null,
          transactionId: transaction!.id,
          paymentReference,
          message: "Orange Money non configuré. Mode démo.",
          status: "pending",
        },
        200,
      );
    }

    // TODO: Implement actual Orange Money API v2 Sénégal call.
    // En l'état l'intégration OM directe n'existe pas : on refuse fail-closed
    // plutôt que de simuler un succès. En pratique, Orange Money passe par
    // Bictorys (payment_type=orange_money) qui renvoie le code USSD à afficher
    // (ex. #144*82#) — utiliser create-charge.
    return json(
      {
        paymentUrl: null,
        transactionId: transaction!.id,
        paymentReference,
        message:
          "Orange Money intégration en cours — utiliser create-charge (provider bictorys) pour le USSD.",
        status: "pending",
      },
      200,
    );
  } catch (err: any) {
    console.error("create-om-payment error:", err);
    return json({ error: err.message || "Erreur interne" }, 500);
  }
});
