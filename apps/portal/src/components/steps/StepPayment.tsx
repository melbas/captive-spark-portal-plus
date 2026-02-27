import { useState } from 'react';
import { ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import type { SelectedPlan } from '../../pages/CaptivePortal';

interface Props {
  siteId: string;
  siteSlug: string;
  userId: string;
  plan: SelectedPlan;
  mac: string;
  apMac: string;
  ssid: string;
  redirectUrl: string;
  demoMode: boolean;
  primaryColor: string;
  whatsappSupport?: string | null;
  onPaymentInitiated: (txId: string) => void;
  onSuccess: () => void;
  onBack: () => void;
}

type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'demo';

const PAYMENT_METHODS = [
  {
    id: 'wave' as const,
    name: 'Wave',
    color: '#1BCEDF',
    gradient: 'linear-gradient(135deg, #1BCEDF 0%, #5B4DFF 100%)',
    emoji: '🌊',
    desc: 'Paiement instantané',
  },
  {
    id: 'orange_money' as const,
    name: 'Orange Money',
    color: '#FF6B00',
    gradient: 'linear-gradient(135deg, #FF6B00 0%, #FF4D6A 100%)',
    emoji: '🟠',
    desc: 'Disponible 24h/24',
  },
  {
    id: 'free_money' as const,
    name: 'Free Money',
    color: '#E30613',
    gradient: 'linear-gradient(135deg, #E30613 0%, #FF4D6A 100%)',
    emoji: '🔴',
    desc: 'Réseau Free Sénégal',
  },
];

export function StepPayment({
  siteId, siteSlug, userId, plan, mac, apMac, ssid, redirectUrl,
  demoMode, primaryColor, whatsappSupport, onPaymentInitiated, onSuccess, onBack,
}: Props) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createWavePayment = trpc.portal.createWavePayment.useMutation();
  const authorizeGuest = trpc.portal.authorizeGuest.useMutation();

  const handlePay = async () => {
    if (!selectedMethod) return;
    setIsProcessing(true);

    try {
      if (demoMode || selectedMethod === 'demo') {
        // Mode démo : autorisation directe sans paiement
        const result = await authorizeGuest.mutateAsync({
          siteId,
          userId,
          planId: plan.id,
          transactionId: crypto.randomUUID(),
          mac: mac || '00:00:00:00:00:00',
          apMac: apMac || undefined,
          ssid: ssid || undefined,
          demoMode: true,
        });
        if (result.success) {
          onPaymentInitiated(crypto.randomUUID());
          onSuccess();
        }
        return;
      }

      if (selectedMethod === 'wave') {
        // Créer une session Wave et rediriger
        const result = await createWavePayment.mutateAsync({
          siteId,
          userId,
          planId: plan.id,
          mac,
          apMac: apMac || undefined,
          ssid: ssid || undefined,
          redirectUrl: redirectUrl || undefined,
          origin: window.location.origin,
        });

        onPaymentInitiated(result.transactionId);
        // Redirection vers Wave
        window.location.href = result.checkoutUrl;
        return;
      }

      // Orange Money / Free Money : afficher les instructions USSD
      // TODO Phase 2 : intégration API Orange Money
      alert(`Paiement ${selectedMethod === 'orange_money' ? 'Orange Money' : 'Free Money'} — Disponible prochainement.\n\nContactez le support WhatsApp pour assistance.`);

    } catch (err: any) {
      alert(err.message ?? 'Erreur lors du paiement. Réessayez.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-4 pc-animate-slide-up">
      {/* Récapitulatif du forfait */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}15, #FF4D6A15)`,
          border: `1px solid ${primaryColor}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--pc-muted)' }}>Forfait sélectionné</p>
            <p className="text-xl font-black" style={{ color: 'var(--pc-text)' }}>{plan.name}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black" style={{ color: primaryColor }}>
              {plan.priceFcfa.toLocaleString('fr-FR')}
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--pc-muted)' }}>FCFA</p>
          </div>
        </div>
      </div>

      {/* Sélection méthode de paiement */}
      <div>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--pc-text)' }}>
          Choisissez votre mode de paiement
        </h3>

        <div className="flex flex-col gap-3">
          {/* Mode démo */}
          {demoMode && (
            <button
              className="w-full p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: selectedMethod === 'demo' ? '#10B981' : 'var(--pc-border)',
                background: selectedMethod === 'demo' ? '#10B98110' : 'var(--pc-surface)',
              }}
              onClick={() => setSelectedMethod('demo')}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <p className="font-bold" style={{ color: 'var(--pc-text)' }}>Mode démo</p>
                  <p className="text-xs" style={{ color: 'var(--pc-muted)' }}>Tester sans paiement réel</p>
                </div>
                {selectedMethod === 'demo' && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </button>
          )}

          {PAYMENT_METHODS.map(method => (
            <button
              key={method.id}
              className="w-full p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                borderColor: selectedMethod === method.id ? method.color : 'var(--pc-border)',
                background: selectedMethod === method.id ? `${method.color}10` : 'var(--pc-surface)',
              }}
              onClick={() => setSelectedMethod(method.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: method.gradient }}
                >
                  {method.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: 'var(--pc-text)' }}>{method.name}</p>
                  <p className="text-xs" style={{ color: 'var(--pc-muted)' }}>{method.desc}</p>
                </div>
                {selectedMethod === method.id && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: method.color }}
                  >
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sécurité */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--pc-muted)' }}>
        <ShieldCheck size={14} />
        <span>Paiement sécurisé — Vos données sont protégées</span>
      </div>

      {/* Boutons */}
      <div className="flex flex-col gap-3">
        <button
          className="pc-btn-primary"
          onClick={handlePay}
          disabled={!selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full pc-animate-spin" />
              Traitement en cours...
            </span>
          ) : `Payer ${plan.priceFcfa.toLocaleString('fr-FR')} FCFA →`}
        </button>

        <button className="pc-btn-outline" onClick={onBack} disabled={isProcessing}>
          ← Changer de forfait
        </button>
      </div>

      {/* Support WhatsApp */}
      {whatsappSupport && (
        <a
          href={`https://wa.me/${whatsappSupport.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-green-600"
        >
          <MessageCircle size={16} />
          Besoin d'aide ? Contactez-nous sur WhatsApp
        </a>
      )}
    </div>
  );
}
