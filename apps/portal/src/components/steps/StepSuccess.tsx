import { useEffect, useState } from 'react';
import { CheckCircle, Wifi, Clock, Globe, MessageCircle } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import type { AuthState, SelectedPlan } from '../../pages/CaptivePortal';

interface Props {
  site: { name: string; primaryColor: string; whatsappSupport?: string | null };
  plan: SelectedPlan | null;
  auth: AuthState | null;
  transactionId: string | null;
  mac: string;
  apMac: string;
  ssid: string;
  redirectUrl: string;
  demoMode: boolean;
}

export function StepSuccess({ site, plan, auth, transactionId, mac, apMac, ssid, redirectUrl, demoMode }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorizeGuest = trpc.portal.authorizeGuest.useMutation();

  // Autoriser l'accès si on revient du callback Wave avec tx + mac
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const txId = urlParams.get('tx');
    const macFromUrl = urlParams.get('mac');
    const apFromUrl = urlParams.get('ap');
    const ssidFromUrl = urlParams.get('ssid');
    const redirectFromUrl = urlParams.get('redirect');

    if (txId && macFromUrl && plan && auth && !authorized) {
      setIsAuthorizing(true);
      authorizeGuest.mutateAsync({
        siteId: '', // Sera résolu côté serveur via transactionId
        userId: auth.userId,
        planId: plan.id,
        transactionId: txId,
        mac: macFromUrl,
        apMac: apFromUrl || undefined,
        ssid: ssidFromUrl || undefined,
        demoMode: false,
      }).then(result => {
        if (result.success) {
          setAuthorized(true);
          const durationSec = result.durationMin * 60;
          setSecondsLeft(durationSec);

          // Redirection après 5 secondes
          const target = redirectFromUrl || redirectUrl || 'https://www.google.com';
          setTimeout(() => {
            window.location.href = target;
          }, 5000);
        }
      }).catch(err => {
        setError(err.message);
      }).finally(() => {
        setIsAuthorizing(false);
      });
    } else if (demoMode || authorized) {
      // Mode démo : simuler une session
      if (plan) setSecondsLeft(plan.durationMin * 60);
      setAuthorized(true);
    }
  }, []);

  // Countdown de session
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft(s => (s ?? 1) - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isAuthorizing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 pc-animate-slide-up">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: `${site.primaryColor}20` }}
        >
          <Wifi size={40} style={{ color: site.primaryColor }} className="pc-animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-center" style={{ color: 'var(--pc-text)' }}>
          Connexion en cours...
        </h2>
        <p className="text-sm text-center" style={{ color: 'var(--pc-muted)' }}>
          Autorisation de votre appareil sur le réseau
        </p>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full pc-animate-pulse"
            style={{ width: '60%', background: `linear-gradient(90deg, ${site.primaryColor}, #FF4D6A)` }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 pt-8 pc-animate-slide-up">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-xl font-black text-center text-red-600">Erreur de connexion</h2>
        <p className="text-sm text-center" style={{ color: 'var(--pc-muted)' }}>{error}</p>
        {site.whatsappSupport && (
          <a
            href={`https://wa.me/${site.whatsappSupport.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pc-btn-primary flex items-center justify-center gap-2"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={18} />
            Contacter le support WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-6 pc-animate-bounce-in">
      {/* Icône succès */}
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${site.primaryColor}, #FF4D6A)` }}
      >
        <CheckCircle size={52} color="white" strokeWidth={2.5} />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black" style={{ color: 'var(--pc-text)' }}>
          {demoMode ? 'Démo réussie !' : 'Vous êtes connecté !'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--pc-muted)' }}>
          {demoMode
            ? 'En production, votre appareil serait maintenant connecté'
            : 'Votre appareil a été autorisé sur le réseau'}
        </p>
      </div>

      {/* Infos de session */}
      {plan && (
        <div className="w-full pc-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--pc-bg)' }}>
              <Wifi size={20} className="mx-auto mb-1" style={{ color: site.primaryColor }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--pc-muted)' }}>Forfait</p>
              <p className="text-sm font-black" style={{ color: 'var(--pc-text)' }}>{plan.name}</p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--pc-bg)' }}>
              <Clock size={20} className="mx-auto mb-1" style={{ color: site.primaryColor }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--pc-muted)' }}>Temps restant</p>
              <p className="text-sm font-black font-mono" style={{ color: 'var(--pc-text)' }}>
                {secondsLeft !== null ? formatTime(secondsLeft) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Points de fidélité gagnés */}
      {auth && (
        <div
          className="w-full flex items-center gap-3 p-3 rounded-xl"
          style={{ background: `${site.primaryColor}10`, border: `1px solid ${site.primaryColor}30` }}
        >
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-sm font-bold" style={{ color: site.primaryColor }}>+10 points de fidélité gagnés !</p>
            <p className="text-xs" style={{ color: 'var(--pc-muted)' }}>
              Total : {(auth.loyaltyPts + 10).toLocaleString('fr-FR')} points
            </p>
          </div>
        </div>
      )}

      {/* Redirection */}
      {!demoMode && redirectUrl && (
        <div className="w-full flex items-center gap-2 text-sm" style={{ color: 'var(--pc-muted)' }}>
          <Globe size={14} />
          <span>Redirection automatique dans 5 secondes...</span>
        </div>
      )}

      {/* Bouton navigation */}
      <a
        href={redirectUrl || 'https://www.google.com'}
        className="pc-btn-primary flex items-center justify-center gap-2"
        style={{ background: `linear-gradient(135deg, ${site.primaryColor}, #FF4D6A)` }}
      >
        <Globe size={18} />
        {demoMode ? 'Simuler la navigation' : 'Naviguer sur Internet'}
      </a>

      {/* Support */}
      {site.whatsappSupport && (
        <a
          href={`https://wa.me/${site.whatsappSupport.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold text-green-600"
        >
          <MessageCircle size={16} />
          Support WhatsApp
        </a>
      )}
    </div>
  );
}
