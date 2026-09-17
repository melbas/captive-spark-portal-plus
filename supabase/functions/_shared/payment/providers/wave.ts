/**
 * Provider Wave (fallback direct) — refactor de `create-wave-payment`.
 *
 * Ce provider préserve le comportement historique (API Wave directe) tout en
 * implémentant l'abstraction `PaymentProvider` : la logique transverse
 * (identité de l'appelant, montant validé contre le forfait, idempotence,
 * URLs succès/erreur) est mutualisée dans `create-charge`, pas dupliquée.
 *
 * Référence : api.wave.com/v1/checkout/sessions.
 */

import type {
  ChargeParams,
  ChargeResult,
  PaymentProvider,
  TransactionStatus,
} from "../provider.ts";
import { PaymentProviderError } from "../provider.ts";

/** Statuts Wave → statut interne canonique. */
const STATUS_MAP: Record<string, TransactionStatus> = {
  "checkout.session.completed": "succeeded",
  "checkout.session.failed": "failed",
  "checkout.session.expired": "cancelled",
};

/** Wave accepte uniquement wave_money via ce provider. */
const SUPPORTED_METHODS = new Set(["wave_money"]);

export const waveProvider: PaymentProvider = {
  id: "wave",

  requiredSecrets(): string[] {
    return ["WAVE_SECRET_KEY"];
  },

  async createCharge(params: ChargeParams): Promise<ChargeResult> {
    const secretKey = Deno.env.get("WAVE_SECRET_KEY");
    if (!secretKey) {
      // Dev mode : checkout simulé (comportement historique conservé).
      console.warn(
        "[DEV] WAVE_SECRET_KEY absent — checkout Wave simulé (pas de paiement réel)",
      );
      return {
        providerTransactionId: undefined,
        status: "pending",
        message: "Wave non configuré. Mode démo.",
      };
    }

    if (!SUPPORTED_METHODS.has(params.method)) {
      throw new PaymentProviderError(
        `Wave direct ne supporte que wave_money (reçu ${params.method}) — utiliser le provider bictorys pour les autres méthodes`,
      );
    }

    if (!Number.isInteger(params.amount) || params.amount < 100) {
      throw new PaymentProviderError(
        `Montant invalide : entier FCFA >= 100 requis (reçu ${params.amount})`,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // Webhook Wave = source de vérité (HMAC fail-closed dans wave-webhook).
    const successUrl =
      `${supabaseUrl}/functions/v1/wave-webhook?status=success&tx=${params.transactionId}`;
    const errorUrl =
      `${supabaseUrl}/functions/v1/wave-webhook?status=error&tx=${params.transactionId}`;

    let res: Response;
    try {
      res = await fetch("https://api.wave.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          // Bearer <clé secrète Wave> (clé Edge WAVE_SECRET_KEY).
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || "XOF",
          success_url: successUrl,
          error_url: errorUrl,
          client_reference: params.transactionId,
        }),
      });
    } catch (e) {
      throw new PaymentProviderError(
        `Wave injoignable : ${e instanceof Error ? e.message : "network error"}`,
        { retryable: true },
      );
    }

    const waveData: Record<string, unknown> = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = String(
        waveData.message || waveData.error || `HTTP ${res.status}`,
      );
      throw new PaymentProviderError(`Wave API : ${msg}`, {
        retryable: res.status >= 500,
      });
    }

    return {
      providerTransactionId: (waveData.id as string) || undefined,
      redirectUrl:
        (waveData.wave_launch_url as string) ||
        (waveData.checkout_url as string) ||
        undefined,
      status: "processing",
    };
  },

  mapStatus(providerStatus: string): TransactionStatus {
    return STATUS_MAP[providerStatus] || "pending";
  },
};
