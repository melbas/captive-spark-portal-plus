/**
 * Provider Bictorys (agrégateur de paiement ouest-africain) — PROVIDER PRINCIPAL.
 *
 * Référence : docs.bictorys.com/docs/integration (mars 2026).
 *   Sandbox : https://api.test.bictorys.com   |  Prod : https://api.bictorys.com
 *   Charge  : POST {API_URL}/pay/v1/charges?payment_type={type}
 *             header `X-Api-Key: <clé PUBLIQUE>`
 *   Status  : GET  {API_URL}/pay/v1/transactions/{transactionId}/status
 *
 * Sécurité :
 *   - `BICTORYS_PRIVATE_KEY` (payouts) NE JAMAIS être lue ici ni exposée au
 *     front. Une charge n'utilise QUE la clé publique (charges + status).
 *   - Les webhooks sont la source de vérité : on ne SONDE PAS le status en
 *     boucle (voir bictorys-webhook).
 *   - WAF : 403 HTML "Forbidden" (rate-limit) → backoff exponentiel puis échec ;
 *     403 JSON "Access right not sufficient" → clé invalide (non retryable).
 */

import type {
  ChargeParams,
  ChargeResult,
  PaymentProvider,
  TransactionStatus,
} from "../provider.ts";
import { PaymentProviderError } from "../provider.ts";

/** payment_type Bictorys (8 méthodes) — indexé par notre PaymentMethod. */
const PAYMENT_TYPE: Record<string, string> = {
  wave_money: "wave_money",
  orange_money: "orange_money",
  mtn_money: "mtn_money",
  moov: "moov",
  togocell: "togocell",
  mobicash: "mobicash",
  maxit: "maxit",
  card: "card",
};

/** Statuts Bictorys → statut interne canonique (référence integration docs). */
const STATUS_MAP: Record<string, TransactionStatus> = {
  succeeded: "succeeded",
  authorized: "processing",
  pending: "pending",
  processing: "processing",
  failed: "failed",
  cancelled: "cancelled",
  reversed: "refunded",
};

/** Délais du backoff exponentiel (ms) face au rate-limit WAF (403 HTML). */
const WAF_BACKOFF_MS = [500, 1000, 2000, 4000];
const MAX_ATTEMPTS = 1 + WAF_BACKOFF_MS.length;

function apiUrl(): string {
  const explicit = Deno.env.get("BICTORYS_API_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  // Clés sandbox préfixées `test_public-...` / `test_secret-...` → sandbox.
  const key = Deno.env.get("BICTORYS_API_KEY") || "";
  return key.startsWith("test_")
    ? "https://api.test.bictorys.com"
    : "https://api.bictorys.com";
}

/**
 * Normalise un numéro de téléphone au format Bictorys : `+221771234567`,
 * sans espaces. Exige le format E.164 complet (préfixe `+`) — le portail
 * construit toujours `${countryCode}${phoneNumber}` (ex. `+221` + `771234567`).
 * Tout numéro sans préfixe pays est refusé (fail-closed) plutôt que deviné.
 * Exporté pour les tests unitaires (P1).
 */
export function normalizePhone(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("+")) return undefined;
  // On ne garde que les chiffres ; le `+` initial est repositionné.
  const digits = trimmed.slice(1).replace(/[^\d]/g, "");
  // Format valide : 6 à 15 chiffres (E.164 sans le `+`).
  if (/^\d{6,15}$/.test(digits)) return `+${digits}`;
  return undefined;
}

/** Détecte un rate-limit WAF : 403 + corps non-JSON (HTML "Forbidden"). */
async function isWafBlocked(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const contentType = res.headers.get("content-type") || "";
  return !contentType.includes("application/json");
}

export const bictorysProvider: PaymentProvider = {
  id: "bictorys",

  requiredSecrets(): string[] {
    // Clé PUBLIQUE uniquement (charges + status check).
    // `BICTORYS_PRIVATE_KEY` / `BICTORYS_MERCHANT_SECRET_CODE` (payouts) ne sont
    // pas nécessaires à une charge — et ne doivent jamais fuir côté client.
    return ["BICTORYS_API_KEY"];
  },

  async createCharge(params: ChargeParams): Promise<ChargeResult> {
    const apiKey = Deno.env.get("BICTORYS_API_KEY");
    if (!apiKey) {
      throw new PaymentProviderError("BICTORYS_API_KEY absent", {
        invalidConfig: true,
      });
    }
    if (!Number.isInteger(params.amount) || params.amount < 100) {
      throw new PaymentProviderError(
        `Montant invalide : entier FCFA >= 100 requis (reçu ${params.amount})`,
      );
    }
    const paymentType = PAYMENT_TYPE[params.method];
    if (!paymentType) {
      throw new PaymentProviderError(
        `Méthode non supportée par Bictorys : ${params.method}`,
      );
    }
    const phone = normalizePhone(params.customerPhone);
    if (!phone) {
      throw new PaymentProviderError(
        `Téléphone invalide (format attendu +221771234567) : "${params.customerPhone ?? ""}"`,
      );
    }

    const base = apiUrl();
    // Référence provider unique : id transaction interne + nonce temporel.
    const paymentReference = `pc-${params.transactionId}-${Date.now()}`;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const customerObject: Record<string, string> = {
      name: params.customerName || params.customerPhone || "Client",
      phone,
      country: params.country || "SN",
    };
    if (params.customerEmail) customerObject.email = params.customerEmail;

    const successUrl = `${supabaseUrl}/functions/v1/bictorys-redirect?tx=${params.transactionId}&status=success`;
    const errorUrl = `${supabaseUrl}/functions/v1/bictorys-redirect?tx=${params.transactionId}&status=error`;
    const body = {
      amount: params.amount,
      currency: params.currency || "XOF",
      country: params.country || "SN",
      paymentReference,
      successRedirectUrl: successUrl,
      ErrorRedirectUrl: errorUrl,
      customerObject,
    };

    // Backoff exponentiel sur rate-limit WAF (403 HTML "Forbidden").
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${base}/pay/v1/charges?payment_type=${paymentType}`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        // Erreur réseau / timeout → retryable.
        lastError = e;
        if (attempt < WAF_BACKOFF_MS.length) {
          await new Promise((r) => setTimeout(r, WAF_BACKOFF_MS[attempt]));
          continue;
        }
        throw new PaymentProviderError(
          `Bictorys injoignable : ${e instanceof Error ? e.message : "network error"}`,
          { retryable: true },
        );
      }

      // 403 HTML = rate-limit WAF → backoff puis retry.
      if (await isWafBlocked(res)) {
        lastError = new Error("Bictorys WAF rate-limit (403 HTML)");
        if (attempt < WAF_BACKOFF_MS.length) {
          await new Promise((r) => setTimeout(r, WAF_BACKOFF_MS[attempt]));
          continue;
        }
        throw new PaymentProviderError(
          "Bictorys : rate-limit WAF persistant (backoff épuisé)",
          { retryable: true },
        );
      }

      const jsonBody: Record<string, unknown> = await res
        .json()
        .catch(() => ({} as Record<string, unknown>));

      // 403 JSON "Access right not sufficient" → clé invalide, non retryable.
      if (res.status === 403) {
        const msg = String(
          jsonBody.message || jsonBody.error || "Access right not sufficient",
        );
        throw new PaymentProviderError(`Bictorys : clé invalide — ${msg}`, {
          invalidConfig: true,
        });
      }

      if (!res.ok) {
        const msg = String(
          jsonBody.message || jsonBody.error || `HTTP ${res.status}`,
        );
        // 5xx = retryable ; 4xx = erreur cliente (montant, paramètres).
        throw new PaymentProviderError(`Bictorys : ${msg}`, {
          retryable: res.status >= 500,
        });
      }

      const transactionId = jsonBody.transactionId as string | undefined;
      if (!transactionId) {
        throw new PaymentProviderError(
          "Bictorys : réponse sans transactionId",
          { retryable: true },
        );
      }

      return {
        providerTransactionId: transactionId,
        redirectUrl: (jsonBody.redirectUrl as string) || undefined,
        link: (jsonBody.link as string) || undefined,
        qrCode: (jsonBody.qrCode as string) || undefined,
        message: (jsonBody.message as string) || undefined,
        status: "processing",
      };
    }

    // Toutes les tentatives épuisées sur erreurs retryables.
    throw new PaymentProviderError(
      `Bictorys : échec création charge après ${MAX_ATTEMPTS} tentatives` +
        (lastError instanceof Error ? ` — ${lastError.message}` : ""),
      { retryable: true },
    );
  },

  mapStatus(providerStatus: string): TransactionStatus {
    return STATUS_MAP[providerStatus.toLowerCase()] || "pending";
  },
};
