import type { FastifyInstance } from 'fastify';
import { verifyWaveWebhook, getWaveCheckout } from '../services/payments/wave.js';
import { completeTransaction, failTransaction } from '../db/queries/portal.js';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const { transactions, wifiSessions, hardwareIntegrations, wifiPlans } = schema;

export async function webhookRoutes(app: FastifyInstance) {

  // ─── Webhook Wave ──────────────────────────────────────────────────────────
  app.post('/wave', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const signature = req.headers['wave-signature'] as string ?? '';
    const rawBody = (req as any).rawBody as string ?? JSON.stringify(req.body);

    // Vérifier la signature HMAC (Règle Knowledge v3.0)
    if (!verifyWaveWebhook(rawBody, signature)) {
      app.log.warn('[Wave Webhook] Signature invalide');
      return reply.status(401).send({ error: 'Signature invalide' });
    }

    const event = req.body as any;
    app.log.info(`[Wave Webhook] Event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const checkoutId = event.data?.id;
      const clientRef = event.data?.client_reference;

      if (!clientRef) {
        return reply.status(400).send({ error: 'client_reference manquant' });
      }

      try {
        // Vérifier l'état de la session Wave
        const checkout = await getWaveCheckout(checkoutId);
        if (checkout.checkout_status !== 'complete') {
          return reply.status(200).send({ received: true });
        }

        // Récupérer la transaction
        const db = getDb();
        const txs = await db.select().from(transactions).where(eq(transactions.id, clientRef)).limit(1);
        const tx = txs[0];
        if (!tx || tx.status === 'completed') {
          return reply.status(200).send({ received: true });
        }

        // Compléter la transaction
        await completeTransaction(tx.id, checkoutId);

        // TODO : déclencher l'autorisation hardware via une queue Bull
        // Pour l'instant, logger pour traitement manuel
        app.log.info(`[Wave] Transaction ${tx.id} complétée — autorisation hardware à déclencher`);

      } catch (err) {
        app.log.error('[Wave Webhook] Erreur:', err);
        return reply.status(500).send({ error: 'Erreur interne' });
      }
    }

    if (event.type === 'checkout.session.payment_error') {
      const clientRef = event.data?.client_reference;
      if (clientRef) {
        await failTransaction(clientRef).catch(console.error);
      }
    }

    return reply.status(200).send({ received: true });
  });

  // ─── Webhook Orange Money (placeholder Phase 2) ────────────────────────────
  app.post('/orange-money', async (req, reply) => {
    app.log.info('[Orange Money Webhook] Reçu:', req.body);
    // TODO Phase 2 : implémenter la vérification Orange Money
    return reply.status(200).send({ received: true });
  });
}
