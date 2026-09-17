/**
 * Provider Orange Money (fallback direct) — refactor de `create-om-payment`.
 *
 * L'API Orange Money v2 Sénégal n'est PAS encore implémentée côté provider
 * (état historique : TODO dans `create-om-payment`). Le provider existe pour
 * garder l'abstraction complète et permettre l'activation sans toucher au
 * reste : il renvoie fail-closed (503 explicite) tant que ORANGE_MONEY_API_KEY
 * n'est pas configuré, au lieu de simuler un succès.
 *
 * En pratique, Orange Money passe par Bictorys (`payment_type=orange_money`),
 * qui renvoie le code USSD à afficher (`#144*82#`) — c'est le chemin à utiliser.
 */

import type {
  ChargeParams,
  ChargeResult,
  PaymentProvider,
  TransactionStatus,
} from "../provider.ts";
import { PaymentProviderError } from "../provider.ts";

const STATUS_MAP: Record<string, TransactionStatus> = {
  succeeded: "succeeded",
  success: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
  cancelled_user: "cancelled",
  pending: "pending",
};

const SUPPORTED_METHODS = new Set(["orange_money"]);

export const orangeProvider: PaymentProvider = {
  id: "orange",

  requiredSecrets(): string[] {
    return ["ORANGE_MONEY_API_KEY"];
  },

  async createCharge(params: ChargeParams): Promise<ChargeResult> {
    if (!SUPPORTED_METHODS.has(params.method)) {
      throw new PaymentProviderError(
        `Orange Money direct ne supporte que orange_money (reçu ${params.method}) — utiliser le provider bictorys pour les autres méthodes`,
      );
    }

    const apiKey = Deno.env.get("ORANGE_MONEY_API_KEY");
    if (!apiKey) {
      // Fail-closed : on NE simule pas un succès de paiement.
      throw new PaymentProviderError(
        "Orange Money direct non configuré (ORANGE_MONEY_API_KEY absent) — utiliser le provider bictorys (payment_type=orange_money) pour le USSD",
        { invalidConfig: true },
      );
    }

    // TODO(backend) : implémenter l'appel Orange Money v2 Sénégal.
    // En l'état, on refuse fail-closed plutôt que de simuler.
    throw new PaymentProviderError(
      "Orange Money direct : intégration API v2 Sénégal non implémentée — utiliser le provider bictorys (payment_type=orange_money)",
      { invalidConfig: true },
    );
  },

  mapStatus(providerStatus: string): TransactionStatus {
    return STATUS_MAP[providerStatus.toLowerCase()] || "pending";
  },
};
