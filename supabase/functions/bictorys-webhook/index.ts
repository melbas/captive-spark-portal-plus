/**
 * bictorys-webhook — webhook ENTRANT Bictorys (source de vérité des paiements).
 *
 * Référence : docs.bictorys.com/docs/integration (mars 2026).
 *   Headers : `X-Secret-Key` (toujours) + `X-Webhook-Signature` +
 *             `X-Webhook-Timestamp` (HMAC optionnel)
 *   Payload : { id, type, amount, currency, paymentReference,
 *               pspName, merchantFees, customerFees, status, timestamp }
 *
 * Sécurité (fail-closed) :
 *   1. `BICTORYS_WEBHOOK_SECRET` OBLIGATOIRE (secret dédié, PAS la private key)
 *      → absent = 503, aucun traitement.
 *   2. HMAC-SHA256(`${timestamp}.${rawBody}`) en hex, comparaison à temps
 *      constant, replay protection 5 min.
 *   3. Fallback secret statique si signature absente (à désactiver en prod).
 *   4. Idempotence via `processed_webhook_events` (table partagée avec Wave).
 *   5. Vérification du montant payé vs transaction interne.
 *   6. Mapping statut Bictorys → `transactions.status`.
 *
 * Séparation prod/sandbox : les webhooks test et prod sont SÉPARÉS (URL
 * différente côté Bictorys) — cette fonction gère les deux, la valeur de
 * `BICTORYS_API_URL` détermine l'environnement au moment de la charge.
 *
 * NE SONDE PAS le statut en boucle : ce webhook est la source de vérité.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/auth.ts";
import { registerAllProviders } from "../_shared/payment/providers/index.ts";
import { bictorysProvider } from "../_shared/payment/providers/bictorys.ts";
import { mapProviderStatus } from "../_shared/payment/registry.ts";
import { verifyWebhookSignature } from "../_shared/payment/webhook.ts";

// Enregistre les implémentations providers réelles (runtime Deno uniquement).
registerAllProviders();

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Payload webhook Bictorys (champs effectivement lus). */
interface BictorysWebhookPayload {
  id: string;
  type?: string;
  amount?: number;
  currency?: string;
  paymentReference?: string;
  pspName?: string;
  merchantFees?: number;
  customerFees?: number;
  status?: string;
  timestamp?: string | number;
}

/** Colonnes nécessaires de la transaction interne. */
interface InternalTransaction {
  id: string;
  status: string;
  amount: number;
  amount_fcfa: number | null;
  site_id: string;
  plan_id: string | null;
  user_id: string | null;
  provider: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Corps BRUT — la signature porte sur les octets exacts reçus.
    const rawBody = await req.text();

    // 1. FAIL-CLOSED : pas de secret dédié configuré → 503, rien traité.
    const webhookSecret = Deno.env.get("BICTORYS_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("bictorys-webhook: BICTORYS_WEBHOOK_SECRET absent → rejet 503");
      return json({ error: "Webhook non configuré" }, 503);
    }

    // 2. Vérification signature HMAC + anti-replay (ou fallback secret statique).
    const verification = await verifyWebhookSignature(rawBody, req.headers, webhookSecret);
    if (!verification.ok) {
      console.error("bictorys-webhook: rejet —", verification.reason);
      // 401 pour signature invalide ; 400 pour un payload/replay malformé.
      const isFormat = verification.reason?.includes("replay") ||
        verification.reason?.includes("timestamp");
      return json(
        { error: verification.reason ?? "Signature invalide" },
        isFormat ? 400 : 401,
      );
    }

    const event: BictorysWebhookPayload = JSON.parse(rawBody);

    // 3. Idempotence : événement déjà traité ? (table partagée avec Wave)
    const eventId: string = event.id ||
      crypto.randomUUID(); // fallback : un body sans id est rejoué, ce qui est sûr
    const { data: already } = await supabase
      .from("processed_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (already) {
      return json({ received: true, duplicate: true }, 200);
    }

    // 4. Retrouver la transaction interne via la référence provider.
    //    `provider_payment_reference` est posé par la migration 20260918000000
    //    et renseigné à la création de la transaction (create-charge) ;
    //    c'est la liaison UNIQUE entre le webhook et la transaction interne,
    //    quel que soit le format de référence choisi par create-charge.
    const paymentReference = event.paymentReference;
    if (!paymentReference) {
      return json({ error: "paymentReference manquant" }, 400);
    }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select<"*", InternalTransaction>(
        "id, status, amount, amount_fcfa, site_id, plan_id, user_id, provider",
      )
      .eq("provider_payment_reference", paymentReference)
      .maybeSingle();
    if (txErr || !tx) {
      console.error(
        "bictorys-webhook: transaction introuvable pour paymentReference=",
        paymentReference,
        txErr,
      );
      // Consommé pour éviter tout rejeu infini, mais ignoré.
      await supabase.from("processed_webhook_events").upsert(
        { event_id: eventId, provider: "bictorys" },
        { onConflict: "event_id" },
      );
      return json({ error: "Transaction introuvable" }, 404);
    }
    const transactionId = tx.id;

    // 5. Mapping statut Bictorys → statut interne.
    const internalStatus = event.status
      ? mapProviderStatus(bictorysProvider, event.status)
      : "pending";

    // 6. Vérification du montant payé vs transaction (P0).
    const expected = Number(tx.amount_fcfa ?? tx.amount);
    const paid = Number(event.amount);
    if (internalStatus === "succeeded") {
      if (!Number.isFinite(paid) || paid < expected) {
        console.error(
          `bictorys-webhook: montant insuffisant — payé ${paid}, attendu ${expected}`,
        );
        await supabase.from("processed_webhook_events").upsert(
          { event_id: eventId, provider: "bictorys", transaction_id: tx.id },
          { onConflict: "event_id" },
        );
        return json({ error: "Montant payé insuffisant" }, 402);
      }
    }

    // 7. Appliquer le nouveau statut.
    await supabase
      .from("transactions")
      .update({
        status: internalStatus,
        completed_at: internalStatus === "succeeded" ? new Date().toISOString() : null,
      })
      .eq("id", tx.id);

    // 8. Succès → déclencher l'autorisation visiteur (authorize-guest).
    if (internalStatus === "succeeded" && tx.status !== "succeeded") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

      // MAC depuis les logs d'audit (preuve de session visiteur).
      const { data: auditLog } = await supabase
        .from("pc_audit_logs")
        .select("details")
        .eq("entity_id", transactionId)
        .eq("action", "payment_initiated")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const mac = (auditLog?.details as Record<string, unknown> | null)?.mac ?? "unknown";

      const authRes = await fetch(`${supabaseUrl}/functions/v1/authorize-guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") || "",
        },
        body: JSON.stringify({
          mac,
          siteId: tx.site_id,
          planId: tx.plan_id,
          userId: tx.user_id,
          transactionId: tx.id,
        }),
      });
      const authData = await authRes.json();
      console.log("bictorys-webhook: authorize-guest result", authData);
    }

    // 9. Marquer l'événement comme traité (idempotence).
    await supabase.from("processed_webhook_events").upsert(
      { event_id: eventId, provider: "bictorys", transaction_id: tx.id },
      { onConflict: "event_id" },
    );

    // 10. Audit.
    await supabase.from("pc_audit_logs").insert({
      action: "bictorys_webhook",
      entity_type: "transaction",
      entity_id: transactionId,
      details: {
        eventType: event.type,
        status: internalStatus,
        pspName: event.pspName,
        providerTransactionEventId: event.id,
      },
    });

    return json({ received: true }, 200);
  } catch (err) {
    console.error("bictorys-webhook error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      500,
    );
  }
});
