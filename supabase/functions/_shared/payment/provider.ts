/**
 * PaymentProvider — abstraction provider-agnostic pour le portail captif.
 *
 * Décision produit (2026-09-17) : Bictorys (agrégateur ouest-africain) devient
 * le provider PRINCIPAL (`PAYMENT_PROVIDER=bictorys` par défaut). Les intégrations
 * Wave / Orange Money directes existantes restent disponibles sous la même
 * abstraction en fallback — elles ne sont PAS supprimées.
 *
 * Tout provider implémente UNIQUEMENT createCharge + mapStatus. La logique
 * transverse (identité de l'appelant, montant validé contre le forfait,
 * idempotence, URLs succès/erreur, retries WAF) est mutualisée dans
 * `create-charge` et `_shared/payment/registry.ts` — pas dupliquée.
 */

/* ============================ Domaine partagé ============================ */

/** Statut interne canonique d'une transaction (colonne `transactions.status`). */
export type TransactionStatus =
  | "pending" // créée, en attente du paiement (valeur initiale)
  | "processing" // charge acceptée par le provider, en cours de confirmation
  | "succeeded" // paiement confirmé (webhook) → autorisation déclenchée
  | "failed" // paiement refusé / erreur provider
  | "cancelled" // abandon utilisateur / expiration
  | "refunded"; // remboursé (mapping Bictorys `reversed`)

/** Méthode de paiement exposée par le portail (alignée sur `transactions.method`). */
export type PaymentMethod =
  | "wave_money"
  | "orange_money"
  | "mtn_money"
  | "moov"
  | "togocell"
  | "mobicash"
  | "maxit"
  | "card";

/* ============================ Entrée / sortie ============================ */

/** Paramètres validés par `create-charge` AVANT l'appel provider. */
export interface ChargeParams {
  /** UUID de la transaction interne créée en base (avant l'appel provider). */
  transactionId: string;
  /** UUID du forfait (wifi_plans) — le montant est TOUJOURS relu en base. */
  planId: string;
  /** UUID du site — détermine le provider si configuré par site (voir registry). */
  siteId: string;
  /** UUID de l'utilisateur (wifi_users) — créateur de la charge. */
  userId: string;
  /** Montant validé contre `wifi_plans.price_fcfa` (entier FCFA, min 100). */
  amount: number;
  /** Devise ISO — Bictorys et Wave utilisent XOF. */
  currency: string;
  /** Téléphone client normalisé E.164 (`+221771234567`, sans espaces). */
  customerPhone?: string;
  /** Email client. */
  customerEmail?: string;
  /** Nom client. */
  customerName?: string;
  /** Pays ISO 2 (Bictorys : requis, `SN` par défaut). */
  country?: string;
  /** Méthode demandée par le portail (mappe vers `payment_type` Bictorys). */
  method: PaymentMethod;
  /** MAC de l'équipement visiteur (preuve de session visiteur). */
  mac: string;
}

/** Résultat d'une création de charge — transporté tel quel vers le front. */
export interface ChargeResult {
  /** Identifiant de transaction COTÉ PROVIDER (wave_checkout_id pour Wave). */
  providerTransactionId?: string;
  /** URL de redirection web (page de paiement / checkout provider). */
  redirectUrl?: string;
  /** Deep link (Wave) ou URL de paiement à ouvrir dans l'app native. */
  link?: string;
  /** QR code en base64 PNG (Wave via Bictorys) — afficher côté portail. */
  qrCode?: string;
  /** Message provider à afficher : USSD Orange/MTN (ex. `#144*82#`). */
  message?: string;
  /** Statut interne synchronisé après la réponse provider. */
  status: TransactionStatus;
}

/* ============================ Contrat provider ============================ */

/** Erreur typée — le registry et `create-charge` décident du retry vs échec. */
export class PaymentProviderError extends Error {
  /** `true` si retryable (rate-limit WAF 403 HTML, timeout, 5xx). */
  readonly retryable: boolean;
  /** `true` si dû à une mauvaise clé (403 JSON "Access right not sufficient"). */
  readonly invalidConfig: boolean;
  constructor(message: string, opts: { retryable?: boolean; invalidConfig?: boolean } = {}) {
    super(message);
    this.name = "PaymentProviderError";
    this.retryable = opts.retryable ?? false;
    this.invalidConfig = opts.invalidConfig ?? false;
  }
}

/**
 * Contrat que tout provider de paiement doit implémenter.
 * Un provider ne connaît JAMAIS : la session visiteur, les policies RLS,
 * l'autorisation — il ne fait que traduire ChargeParams → ChargeResult.
 */
export interface PaymentProvider {
  /** Identifiant stable (`bictorys` | `wave` | `orange`). */
  readonly id: string;

  /**
   * Crée une charge chez le provider.
   * Précondition (garantie par `create-charge`) : `params.amount` a été relu
   * en base et correspond au prix du forfait — le provider ne re-valide pas.
   */
  createCharge(params: ChargeParams): Promise<ChargeResult>;

  /**
   * Secrets Edge requis (fail-closed : absence → `create-charge` 503,
   * jamais de bascule silencieuse vers un autre provider).
   */
  requiredSecrets(): string[];

  /**
   * Mappe un statut provider vers le statut interne canonique.
   * Utilisé par les webhooks entrants (bictorys-webhook, wave-webhook).
   */
  mapStatus?(providerStatus: string): TransactionStatus;
}
