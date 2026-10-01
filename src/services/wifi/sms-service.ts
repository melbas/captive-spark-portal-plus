import { SMSMessage } from "./types";

/**
 * P0 sécurité (AUDIT-BACKEND) : les codes OTP ne sont plus générés, stockés ni
 * vérifiés dans le navigateur. Toute la logique OTP vit côté serveur dans les
 * Edge Functions Supabase :
 *  - `send-otp`   : génération + stockage + rate limiting (3/h/id, 10/j/IP)
 *  - `verify-otp` : vérification + création du wifi_user (via user-service)
 *
 * Ce module n'expose plus que `sendSMS` (notification générique, sans code)
 * utilisée pour le message de bienvenue. Toute fonction de vérification
 * client (generateVerificationCode / sendVerificationCode / verifyCode) a été
 * supprimée — aucun fallback front acceptant un code n'est autorisé
 * (fail-closed, cf. SECURITY_CHECKLIST.md).
 */
export const smsService = {
  async sendSMS(smsData: SMSMessage): Promise<boolean> {
    // La vraie intégration provider SMS n'existe pas encore : les Edge
    // Functions gèrent l'OTP (avec mode démo serveur DEV_OTP_MODE). Ce stub
    // ne manipule AUCUN code de vérification.
    console.log(`[sms-service] sendSMS (stub, pas de provider SMS): to=${smsData.to} type=${smsData.type ?? 'notification'}`);
    return true;
  },
};
