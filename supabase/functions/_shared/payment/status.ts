// Mapping des statuts providers → statut interne canonique.
// Sources : docs.bictorys.com (succeeded/authorized/pending/processing/
// failed/cancelled/reversed). Wave-webhook utilise 'completed'/'failed'.
// Sémantique interne : `authorized` et `processing` sont regroupés
// (charge acceptée, en attente de confirmation par webhook).
// Pure : aucun effet de bord, entièrement testable en Node.

import type { TransactionStatus } from "./provider.ts";

export const BICTORYS_STATUS_MAP: Record<string, TransactionStatus> = {
  succeeded: "succeeded",
  authorized: "processing",
  pending: "pending",
  processing: "processing",
  failed: "failed",
  cancelled: "cancelled",
  reversed: "refunded",
};

const WAVE_MAP: Record<string, TransactionStatus> = {
  completed: "succeeded",
  paid: "succeeded",
  failed: "failed",
  expired: "cancelled",
  cancelled: "cancelled",
  pending: "pending",
};

const ORANGE_MAP: Record<string, TransactionStatus> = {
  succeeded: "succeeded",
  success: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
  cancelled_user: "cancelled",
  pending: "pending",
};

export function mapBictorysStatus(raw: string | undefined | null): TransactionStatus {
  if (!raw) return "pending";
  return BICTORYS_STATUS_MAP[String(raw).toLowerCase()] ?? "pending";
}

export function mapWaveStatus(raw: string | undefined | null): TransactionStatus {
  if (!raw) return "pending";
  return WAVE_MAP[String(raw).toLowerCase()] ?? "pending";
}

export function mapOrangeStatus(raw: string | undefined | null): TransactionStatus {
  if (!raw) return "pending";
  return ORANGE_MAP[String(raw).toLowerCase()] ?? "pending";
}

/** Un statut correspond-il à un paiement abouti ? (authorize-guest déclenché) */
export function isPaid(status: TransactionStatus): boolean {
  return status === "succeeded" || status === "processing";
}

/** Un statut final ne doit plus déclencher authorize-guest. */
export function isFinal(status: TransactionStatus): boolean {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "refunded"
  );
}
