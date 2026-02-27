import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc.js';
import {
  getSiteBySlug, getSiteWithHardware, getPlansBySite, getPlanById,
  findOrCreateWifiUser, createSession, createTransaction,
  completeTransaction, failTransaction, updateUserLoyalty,
} from '../db/queries/portal.js';
import { generateOtp, verifyOtp } from '../services/otp.js';
import { createWaveCheckout, getWaveCheckout } from '../services/payments/wave.js';
import { createAdapter } from '../services/hardware/adapter.js';
import { decrypt } from '../services/crypto.js';

// ─── Validation MAC (Règle 1 Knowledge v3.0) ──────────────────────────────────
const macSchema = z.string().regex(
  /^([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}$|^[0-9a-fA-F]{12}$/,
  'Adresse MAC invalide'
);

export const portalRouter = router({

  // ─── Récupérer la config du portail ────────────────────────────────────────
  getSite: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const site = await getSiteBySlug(input.slug);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Portail introuvable' });

      const plans = await getPlansBySite(site.id);
      return {
        site: {
          id: site.id,
          name: site.name,
          logoUrl: site.logoUrl,
          primaryColor: site.primaryColor ?? '#5B4DFF',
          welcomeMsg: site.welcomeMsg,
          whatsappSupport: site.whatsappSupport,
          type: site.type,
          location: site.location,
        },
        plans: plans.map(p => ({
          id: p.id,
          name: p.name,
          durationMin: p.durationMin,
          priceFcfa: p.priceFcfa,
          speedDownMb: p.speedDownMb,
          speedUpMb: p.speedUpMb,
          dataLimitMb: p.dataLimitMb,
          maxDevices: p.maxDevices,
          isPopular: p.isPopular,
        })),
      };
    }),

  // ─── Envoyer un OTP par SMS ─────────────────────────────────────────────────
  sendOtp: publicProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      phone: z.string().regex(/^\+221[0-9]{9}$/, 'Format invalide (+221XXXXXXXXX)'),
    }))
    .mutation(async ({ input }) => {
      const code = await generateOtp(input.phone, input.siteId);

      // Envoyer le SMS (Orange SMS API ou Twilio en fallback)
      try {
        await sendSms(input.phone, `PremiumConnect : votre code est ${code}. Valable 5 minutes.`);
      } catch (err) {
        console.error('[OTP] Envoi SMS échoué:', err);
        // En développement, logger le code pour les tests
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Code OTP pour ${input.phone}: ${code}`);
        }
      }

      return { sent: true };
    }),

  // ─── Vérifier un OTP ───────────────────────────────────────────────────────
  verifyOtp: publicProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      phone: z.string(),
      code: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      const valid = await verifyOtp(input.phone, input.siteId, input.code);
      if (!valid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code incorrect ou expiré' });

      const user = await findOrCreateWifiUser(input.siteId, input.phone);
      return {
        userId: user.id,
        loyaltyPts: user.loyaltyPts ?? 0,
        loyaltyLevel: user.loyaltyLevel ?? 'basic',
        isNewUser: !user.lastSeenAt || user.lastSeenAt.getTime() === user.createdAt?.getTime(),
      };
    }),

  // ─── Créer une session de paiement Wave ────────────────────────────────────
  createWavePayment: publicProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      userId: z.string().uuid(),
      planId: z.string().uuid(),
      mac: macSchema,
      apMac: z.string().optional(),
      ssid: z.string().optional(),
      redirectUrl: z.string().url().optional(),
      origin: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const plan = await getPlanById(input.planId);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Forfait introuvable' });

      const { site } = await getSiteWithHardware(input.siteId);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site introuvable' });

      // Calculer la commission
      const commissionRate = 0.15; // 15% par défaut
      const commissionFcfa = Math.round(plan.priceFcfa * commissionRate);

      // Créer la transaction en base (status: pending)
      const tx = await createTransaction({
        siteId: input.siteId,
        userId: input.userId,
        planId: input.planId,
        amountFcfa: plan.priceFcfa,
        commissionFcfa,
        method: 'wave',
      });

      // Créer la session Wave
      const successUrl = `${input.origin}/portal/${site.portalSlug}/success?tx=${tx.id}&mac=${encodeURIComponent(input.mac)}&ap=${encodeURIComponent(input.apMac ?? '')}&ssid=${encodeURIComponent(input.ssid ?? '')}&redirect=${encodeURIComponent(input.redirectUrl ?? '')}`;
      const errorUrl = `${input.origin}/portal/${site.portalSlug}?error=payment_failed`;

      const checkout = await createWaveCheckout({
        amount: plan.priceFcfa,
        clientReference: tx.id,
        successUrl,
        errorUrl,
      });

      // Mettre à jour la transaction avec l'ID Wave
      // (sera complétée via webhook ou callback)

      return {
        checkoutUrl: checkout.wave_launch_url,
        checkoutId: checkout.id,
        transactionId: tx.id,
      };
    }),

  // ─── Autoriser l'accès WiFi (après paiement confirmé) ─────────────────────
  authorizeGuest: publicProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      userId: z.string().uuid(),
      planId: z.string().uuid(),
      transactionId: z.string().uuid(),
      mac: macSchema,
      apMac: z.string().optional(),
      ssid: z.string().optional(),
      // Mode démo : bypass hardware pour les tests
      demoMode: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      const plan = await getPlanById(input.planId);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Forfait introuvable' });

      const { site, hardware } = await getSiteWithHardware(input.siteId);
      if (!site) throw new TRPCError({ code: 'NOT_FOUND', message: 'Site introuvable' });

      let hardwareSuccess = false;
      let hardwareMessage = '';

      if (input.demoMode || !hardware) {
        // Mode démo ou pas de hardware configuré
        hardwareSuccess = true;
        hardwareMessage = input.demoMode ? 'Mode démo — aucun hardware requis' : 'Aucun hardware configuré';
      } else {
        // Déchiffrer le mot de passe et appeler l'adaptateur hardware
        try {
          const password = hardware.apiPasswordEnc ? decrypt(hardware.apiPasswordEnc) : '';
          const adapter = await createAdapter({
            brand: hardware.brand,
            controllerUrl: hardware.controllerUrl,
            username: hardware.apiUsername ?? '',
            password,
            siteId: hardware.unifiSiteId ?? 'default',
          });

          const result = await adapter.authorize(input.mac, plan.durationMin, hardware.unifiSiteId ?? 'default');
          hardwareSuccess = result.success;
          hardwareMessage = result.message ?? '';

          if (!result.success) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Autorisation hardware échouée : ${result.message}`,
            });
          }
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erreur hardware : ${err.message}`,
          });
        }
      }

      // Créer la session en base
      const session = await createSession({
        siteId: input.siteId,
        userId: input.userId,
        planId: input.planId,
        macAddress: input.mac,
        apMac: input.apMac,
        ssid: input.ssid,
        durationMin: plan.durationMin,
      });

      // Compléter la transaction
      await completeTransaction(input.transactionId, undefined, session.id);

      // Ajouter des points de fidélité (10 pts par connexion)
      await updateUserLoyalty(input.userId, 10);

      return {
        success: true,
        sessionId: session.id,
        expiresAt: session.expiresAt,
        durationMin: plan.durationMin,
        hardwareMessage,
      };
    }),

  // ─── Accès gratuit (voucher ou admin) ──────────────────────────────────────
  authorizeVoucher: publicProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      code: z.string().length(8),
      mac: macSchema,
      apMac: z.string().optional(),
      ssid: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // TODO : implémenter la validation des vouchers
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Vouchers — Phase 2' });
    }),
});

// ─── Helper SMS interne ───────────────────────────────────────────────────────
async function sendSms(to: string, message: string): Promise<void> {
  const orangeKey = process.env.ORANGE_SMS_API_KEY;
  if (orangeKey) {
    // Orange SMS API Sénégal
    const axios = (await import('axios')).default;
    await axios.post('https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B221/requests', {
      outboundSMSMessageRequest: {
        address: `tel:${to}`,
        senderAddress: `tel:+221`,
        outboundSMSTextMessage: { message },
      },
    }, {
      headers: { Authorization: `Bearer ${orangeKey}` },
    });
    return;
  }

  // Fallback Twilio
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  if (twilioSid && twilioToken && twilioFrom) {
    const axios = (await import('axios')).default;
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      new URLSearchParams({ To: to, From: twilioFrom, Body: message }),
      { auth: { username: twilioSid, password: twilioToken } }
    );
    return;
  }

  throw new Error('Aucun service SMS configuré (ORANGE_SMS_API_KEY ou TWILIO_*)');
}
