/**
 * create-charge — création de charge de paiement GÉNÉRIQUE (provider-agnostic).
 *
 * Remplace les routes spécifiques `create-wave-payment` / `create-om-payment`
 * pour le portail : un seul point d'entrée choisit le provider (Bictorys par
 * défaut, fallback Wave/Orange directs via l'abstraction).
 *
 * Contrat d'authentification :
 *   - JWT OBLIGATOIRE (verify_jwt = true dans config.toml).
 *   - Autorisation réelle côté serveur via `_shared/auth.ts` :
 *       * admin (is_super_admin / can_access_site),
 *       * OU visiteur : preuve de session visiteur issue de `verify-otp`
 *         (le user a été créé côté serveur ; wifi_users.site_id correspond).
 *   - Aucune création de charge sans identité vérifiée.
 *
 * Logique transverse mutualisée (profite à TOUS les providers) :
 *   1. validation de l'identité de l'appelant (auth.ts),
 *   2. relecture en base du prix du forfait → montant validé (jamais celui du
 *      client, qui n'est jamais trusted),
 *   3. idempotence : `paymentReference` unique + contrainte provider_transaction_id,
 *   4. création de la transaction interne (pending) AVANT l'appel provider,
 *   5. enregistrement du provider + provider_transaction_id,
 *   6. URLs succès/erreur construites côté serveur (jamais du client).
 *
 * Échecs :
 *   - 401/403 : authentification / périmètre insuffisant.
 *   - 402 : forfait inactif ou montant incohérent.
 *   - 503 : provider non configuré (secrets manquants) — fail-closed.
 *   - 502 : erreur provider non retryable / injoignable.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, json } from "../_shared/auth.ts";
import { registerAllProviders } from "../_shared/payment/providers/index.ts";
import { selectProvider, assertProviderConfigured } from "../_shared/payment/registry.ts";
import { PaymentProviderError } from "../_shared/payment/provider.ts";
import type { ChargeParams, PaymentMethod } from "../_shared/payment/provider.ts";

// Enregistre les implémentations providers réelles (runtime Deno uniquement).
registerAllProviders();

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_METHODS = new Set<PaymentMethod>([
  "wave_money",
  "orange_money",
  "mtn_money",
  "moov",
  "togocell",
  "mobicash",
  "maxit",
  "card",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // body est conservé pour l'idempotence (rejeu de la transaction existante).
    const body = await req.json().catch(() => ({}));
    const {
      planId,
      siteId,
      method,
      mac,
      customerPhone,
      customerEmail,
      customerName,
      country,
    } = body;

    // 0. Validation de forme (fail-fast).
    if (!planId || !siteId || !method) {
      return json(
        { error: "planId, siteId et method sont requis" },
        400,
      );
    }
    if (!VALID_METHODS.has(method)) {
      return json(
        { error: `Méthode de paiement inconnue : ${method}` },
        400,
      );
    }

    // 1. Authentification + autorisation (visiteur issu de verify-otp, ou admin).
    const authResult = await requireAuth(req, {
      siteId,
      allowVisitor: true,
    });
    if ("error" in authResult) return authResult.error;
    const { ctx } = authResult;

    // Un visiteur ne peut payer QUE pour lui-même.
    if (ctx.kind === "visitor" && ctx.userId && ctx.siteId !== siteId) {
      return json({ error: "Périmètre : ce visiteur n'appartient pas à ce site" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Montant validé contre le forfait — relecture en base (never trust client).
    const { data: plan, error: planErr } = await supabase
      .from("wifi_plans")
      .select("id, name, price_fcfa, is_active, site_id")
      .eq("id", planId)
      .maybeSingle();

    if (planErr || !plan) {
      return json({ error: "Forfait introuvable" }, 404);
    }
    if (!plan.is_active) {
      return json({ error: "Forfait inactif" }, 402);
    }
    const amount = Number(plan.price_fcfa);
    if (!Number.isInteger(amount) || amount < 100) {
      return json(
        { error: `Prix du forfait invalide (entier FCFA >= 100 requis) : ${amount}` },
        402,
      );
    }

    // 3. Sélection du provider (par site > env global > défaut bictorys).
    const { data: siteRow } = await supabase
      .from("sites")
      .select("id, payment_provider, reseller_id")
      .eq("id", siteId)
      .maybeSingle();

    const provider = selectProvider(
      Deno.env.get("PAYMENT_PROVIDER"),
      siteRow?.payment_provider ?? undefined,
    );

    // Fail-closed : secrets présents ? (pas de bascule silencieuse de provider)
    try {
      assertProviderConfigured(provider);
    } catch (e) {
      console.error(`create-charge: provider ${provider.id} non configuré :`, e);
      return json(
        { error: "Passerelle de paiement non configurée", provider: provider.id },
        503,
      );
    }

    // 4. Identité du payeur (visiteur prioritaire ; admin spécifie userId).
    const userId = ctx.kind === "visitor" ? ctx.userId : null;
    if (ctx.kind === "visitor" && !userId) {
      return json({ error: "Identité du payeur introuvable" }, 403);
    }

    // 4b. IDEMPOTENCE — une même clé renvoie la transaction existante au lieu
    //     de créer une double charge. La clé sert aussi de paymentReference
    //     provider (reliée de façon unique au webhook entrant).
    const idempotencyKey: string | undefined = body.idempotencyKey;
    // Toujours définie : clé client ou uuid frais (jamais undefined en base).
    // /!\ Une clé `pc-*` est RESERVÉE au serveur (préfixe des paymentReference)
    //     — une clé client portant ce préfixe est refusée : elle pourrait
    //     sinon faire rejouer (et donc re-payer) une transaction existante.
    if (idempotencyKey && idempotencyKey.startsWith("pc-")) {
      return json(
        { error: "Clé d'idempotence réservée au serveur (préfixe pc- interdit)" },
        400,
      );
    }
    const paymentReference: string = idempotencyKey || `pc-${crypto.randomUUID()}`;
    if (idempotencyKey) {
      const { data: replay } = await supabase
        .from("transactions")
        .select("id, status, provider, provider_transaction_id, provider_payment_reference")
        .eq("site_id", siteId)
        .eq("plan_id", planId)
        .eq("provider_payment_reference", idempotencyKey)
        .maybeSingle();
      if (replay) {
        return json(
          {
            transactionId: replay.id,
            provider: replay.provider,
            providerTransactionId: replay.provider_transaction_id ?? null,
            paymentReference: replay.provider_payment_reference ?? null,
            status: replay.status,
            replayed: true,
          },
          200,
        );
      }
    }

    // 5. Transaction interne créée AVANT l'appel provider (traçabilité).
    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .insert({
        site_id: siteId,
        user_id: userId,
        plan_id: planId,
        amount: amount,
        amount_fcfa: amount,
        method,
        status: "pending",
        provider: provider.id,
        provider_payment_reference: paymentReference,
      })
      .select("id")
      .single();

    if (txErr || !transaction) {
      console.error("create-charge: erreur création transaction :", txErr);
      return json({ error: "Erreur création transaction" }, 500);
    }

    // 6b. Commission revendeur (logique historique conservée).
    let commissionFcfa = 0;
    if (siteRow?.reseller_id) {
      const { data: reseller } = await supabase
        .from("resellers")
        .select("commission_rate")
        .eq("id", siteRow.reseller_id)
        .maybeSingle();
      if (reseller) {
        commissionFcfa = Math.round(amount * (reseller.commission_rate / 100));
      }
    }
    if (commissionFcfa > 0) {
      await supabase
        .from("transactions")
        .update({ commission_fcfa: commissionFcfa })
        .eq("id", transaction.id);
    }

    // 7. Création de la charge provider.
    const chargeParams: ChargeParams = {
      transactionId: transaction.id,
      planId,
      siteId,
      userId: userId || undefined,
      amount,
      currency: "XOF",
      country: country || "SN",
      // Téléphone client : on rejette tout format non E.164 (fail-closed)
      // plutôt que de deviner le préfixe pays — le portail construit toujours
      // `${countryCode}${phoneNumber}` (ex. `+221` + `771234567`).
      customerPhone: customerPhone || undefined,
      customerEmail,
      customerName,
      method,
      mac: mac || "unknown",
    };

    let result;
    try {
      result = await provider.createCharge(chargeParams);
    } catch (e) {
      // Échec provider → la transaction reste pending (le webhook peut encore
      // la résoudre ; sinon un job de nettoyage passera en failed).
      console.error(`create-charge: provider ${provider.id} a échoué :`, e);
      const invalidConfig = e instanceof PaymentProviderError && e.invalidConfig;
      const retryable = e instanceof PaymentProviderError && e.retryable;
      // 502 si erreur provider ; 503 si configuration invalide.
      return json(
        {
          error: e instanceof Error ? e.message : "Erreur provider de paiement",
          provider: provider.id,
          retryable,
        },
        invalidConfig ? 503 : 502,
      );
    }

    // 8. Enregistrement de la référence provider.
    const patch: Record<string, string> = { provider: provider.id };
    if (result.providerTransactionId) {
      patch.provider_transaction_id = result.providerTransactionId;
    }
    await supabase
      .from("transactions")
      .update(patch)
      .eq("id", (transaction as { id: string }).id);

    // 8b. Audit — MAC conservée pour authorize-guest post-webhook (chemin
    //     interne : bictorys-webhook relit ce log pour récupérer la MAC).
    await supabase.from("pc_audit_logs").insert({
      action: "payment_initiated",
      entity_type: "transaction",
      entity_id: transaction.id,
      details: { provider: provider.id, method, amount, mac: mac || "unknown" },
    });

    // 9. Réponse au front — le paiement est ASYNCHRONE.
    const txId = transaction.id;
    return json(
      {
        transactionId: txId,
        provider: provider.id,
        providerTransactionId: result.providerTransactionId ?? null,
        redirectUrl: result.redirectUrl ?? null,
        link: result.link ?? null,
        qrCode: result.qrCode ?? null,
        message: result.message ?? null,
        status: result.status,
      },
      200,
    );
  } catch (err) {
    console.error("create-charge error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      500,
    );
  }
});
