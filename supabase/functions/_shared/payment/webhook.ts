/**
 * Valide la signature HMAC-SHA256 d'un webhook Bictorys — fail-closed.
 *
 * Référence : docs.bictorys.com/docs/integration (mars 2026).
 *   Headers entrants : `X-Secret-Key` (toujours) + `X-Webhook-Signature` +
 *   `X-Webhook-Timestamp` (HMAC optionnel).
 *   Signature : HMAC-SHA256 de `${timestamp}.${rawBody}` en hex.
 *   Replay protection : timestamp à moins de 5 minutes de maintenant.
 *
 * Sécurité :
 *   - `BICTORYS_WEBHOOK_SECRET` est un secret DÉDIÉ (jamais la private key).
 *   - Si la signature est ABSENTE, on accepte uniquement le secret statique
 *     (`X-Secret-Key`) — fallback documenté, à désactiver en prod une fois les
 *     signatures activées côté Bictorys.
 *   - Comparaison à temps constant (timingSafeEqual) sur les deux chemins.
 */

import { timingSafeEqual } from "../crypto.ts";

/** Fenêtre anti-replay : 5 minutes (spécification Bictorys). */
export const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export interface WebhookVerification {
  ok: boolean;
  /** Présent uniquement si `ok === false`. */
  reason?: string;
}

/** Vérifie le header `X-Secret-Key` (secret statique dédié). */
export function verifyStaticKey(
  provided: string | null,
  expected: string,
): boolean {
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * Vérifie signature HMAC + anti-replay d'un webhook Bictorys.
 *
 * @param rawBody corps de requête BRUT (jamais re-sérialisé — la signature
 *               porte sur les octets exacts reçus).
 * @param headers headers de la requête entrante (insensibles à la casse).
 * @param webhookSecret `BICTORYS_WEBHOOK_SECRET` (jamais la private key).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  webhookSecret: string,
): Promise<WebhookVerification> {
  // 1. Mécanismes présents ?
  const signature = headers.get("x-webhook-signature");
  const secretKey = headers.get("x-secret-key");

  // Aucun des deux → rejet (fail-closed).
  if (!signature && !secretKey) {
    return { ok: false, reason: "signature et secret statique absents" };
  }

  // 2. Chemin HMAC (prioritaire, sécurisé).
  if (signature) {
    const tsHeader = headers.get("x-webhook-timestamp");
    if (!tsHeader) {
      return { ok: false, reason: "signature sans X-Webhook-Timestamp" };
    }
    const ts = Number(tsHeader);
    if (!Number.isFinite(ts)) {
      return { ok: false, reason: "timestamp non numérique" };
    }
    const ageMs = Math.abs(Date.now() - ts * 1000);
    if (ageMs > REPLAY_WINDOW_MS) {
      return {
        ok: false,
        reason: `replay rejeté (âge ${Math.round(ageMs / 1000)}s > 300s)`,
      };
    }

    const expected = await hmacHex(webhookSecret, `${ts}.${rawBody}`);
    if (!timingSafeEqual(signature, expected)) {
      return { ok: false, reason: "signature HMAC invalide" };
    }
    return { ok: true };
  }

  // 3. Fallback : secret statique seul (signature absente).
  if (!verifyStaticKey(secretKey, webhookSecret)) {
    return { ok: false, reason: "secret statique invalide" };
  }
  return { ok: true };
}

/** HMAC-SHA256 → hex via Web Crypto (Deno). */
async function hmacHex(secret: string, signed: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed),
  );
  const bytes = new Uint8Array(sig);
  // hex (minuscules — convention Bictorys).
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
