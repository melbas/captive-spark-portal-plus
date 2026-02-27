import axios from 'axios';
import crypto from 'crypto';

// ============================================================
// Wave Sénégal — Service de paiement
// API : https://api.wave.com/v1/checkout/sessions
// ============================================================

const WAVE_API_URL = process.env.WAVE_API_URL ?? 'https://api.wave.com/v1';
const WAVE_SECRET_KEY = process.env.WAVE_SECRET_KEY ?? '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET ?? '';

export interface WaveCheckoutSession {
  id: string;
  wave_launch_url: string;
  client_reference: string;
  amount: number;
  currency: string;
  checkout_status: 'open' | 'complete' | 'expired';
}

export interface CreateCheckoutParams {
  amount: number;          // En FCFA (entier)
  currency?: string;       // 'XOF' par défaut
  clientReference: string; // ID transaction interne
  successUrl: string;
  errorUrl: string;
  restrictPaymentMethod?: string; // 'wave_money'
}

/**
 * Créer une session de paiement Wave
 */
export async function createWaveCheckout(params: CreateCheckoutParams): Promise<WaveCheckoutSession> {
  const response = await axios.post(
    `${WAVE_API_URL}/checkout/sessions`,
    {
      amount: String(params.amount),
      currency: params.currency ?? 'XOF',
      client_reference: params.clientReference,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      restrict_payment_method: params.restrictPaymentMethod,
    },
    {
      headers: {
        Authorization: `Bearer ${WAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data as WaveCheckoutSession;
}

/**
 * Récupérer l'état d'une session de paiement Wave
 */
export async function getWaveCheckout(checkoutId: string): Promise<WaveCheckoutSession> {
  const response = await axios.get(
    `${WAVE_API_URL}/checkout/sessions/${checkoutId}`,
    {
      headers: { Authorization: `Bearer ${WAVE_SECRET_KEY}` },
    }
  );
  return response.data as WaveCheckoutSession;
}

/**
 * Vérifier la signature HMAC d'un webhook Wave
 * Règle Knowledge v3.0 : TOUJOURS vérifier la signature avant de traiter
 */
export function verifyWaveWebhook(payload: string, signature: string): boolean {
  if (!WAVE_WEBHOOK_SECRET) {
    console.warn('[Wave] WAVE_WEBHOOK_SECRET non configuré — webhook non vérifié');
    return false;
  }

  const expectedSig = crypto
    .createHmac('sha256', WAVE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Comparaison en temps constant pour éviter les timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}
