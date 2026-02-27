import { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { StepWelcome } from '../components/steps/StepWelcome';
import { StepAuth } from '../components/steps/StepAuth';
import { StepPlans } from '../components/steps/StepPlans';
import { StepPayment } from '../components/steps/StepPayment';
import { StepSuccess } from '../components/steps/StepSuccess';
import { PortalLoader } from '../components/PortalLoader';
import { PortalError } from '../components/PortalError';

export type PortalStep = 'welcome' | 'auth' | 'plans' | 'payment' | 'success';

export interface PortalParams {
  mac: string;
  apMac: string;
  ssid: string;
  redirectUrl: string;
  demoMode: boolean;
}

export interface AuthState {
  userId: string;
  loyaltyPts: number;
  loyaltyLevel: string;
  phone?: string;
}

export interface SelectedPlan {
  id: string;
  name: string;
  durationMin: number;
  priceFcfa: number;
}

export default function CaptivePortal() {
  const [, params] = useRoute('/portal/:slug');
  const slug = params?.slug ?? '';

  // ─── Paramètres UniFi depuis l'URL ────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const portalParams: PortalParams = {
    mac: urlParams.get('id') ?? urlParams.get('mac') ?? '',
    apMac: urlParams.get('ap') ?? '',
    ssid: urlParams.get('ssid') ?? '',
    redirectUrl: urlParams.get('url') ?? urlParams.get('redirect') ?? '',
    demoMode: urlParams.get('demo') === 'true' || !urlParams.get('id'),
  };

  // ─── État du flux ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<PortalStep>('welcome');
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // ─── Données du site ──────────────────────────────────────────────────────
  const { data, isLoading, error } = trpc.portal.getSite.useQuery(
    { slug },
    { enabled: !!slug, retry: 2, staleTime: 5 * 60 * 1000 }
  );

  // ─── Retour depuis paiement Wave (callback URL) ───────────────────────────
  useEffect(() => {
    const txId = urlParams.get('tx');
    const mac = urlParams.get('mac');
    if (txId && mac && step === 'welcome') {
      // Restaurer l'état depuis les paramètres de callback
      setTransactionId(txId);
      setStep('success');
    }
  }, []);

  const handleAuthSuccess = useCallback((authState: AuthState) => {
    setAuth(authState);
    setStep('plans');
  }, []);

  const handlePlanSelected = useCallback((plan: SelectedPlan) => {
    setSelectedPlan(plan);
    setStep('payment');
  }, []);

  const handlePaymentInitiated = useCallback((txId: string) => {
    setTransactionId(txId);
  }, []);

  const handleSuccess = useCallback(() => {
    setStep('success');
  }, []);

  if (isLoading) return <PortalLoader />;
  if (error || !data) return <PortalError message={error?.message ?? 'Portail introuvable'} />;

  const { site, plans } = data;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--pc-bg)' }}
    >
      {/* ─── Header avec logo du site ───────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.name} className="h-10 w-auto object-contain" />
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${site.primaryColor}, #FF4D6A)` }}
            >
              {site.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--pc-text)' }}>{site.name}</p>
            {site.location && (
              <p className="text-xs" style={{ color: 'var(--pc-muted)' }}>{site.location}</p>
            )}
          </div>
        </div>

        {/* Mode démo badge */}
        {portalParams.demoMode && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700">
            Mode démo
          </span>
        )}
      </header>

      {/* ─── Indicateur d'étapes ─────────────────────────────────────────────── */}
      {step !== 'success' && (
        <div className="flex items-center justify-center gap-2 py-3 px-4">
          {(['welcome', 'auth', 'plans', 'payment'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: step === s
                    ? 'var(--pc-gradient-primary)'
                    : ['welcome','auth','plans','payment'].indexOf(step) > i
                      ? site.primaryColor
                      : 'var(--pc-border)',
                  color: ['welcome','auth','plans','payment'].indexOf(step) >= i ? 'white' : 'var(--pc-muted)',
                }}
              >
                {['welcome','auth','plans','payment'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && (
                <div
                  className="h-0.5 w-6 transition-all duration-300"
                  style={{
                    background: ['welcome','auth','plans','payment'].indexOf(step) > i
                      ? site.primaryColor
                      : 'var(--pc-border)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Contenu principal ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-4 pb-6 max-w-md mx-auto w-full">
        {step === 'welcome' && (
          <StepWelcome
            site={site}
            portalParams={portalParams}
            onNext={() => setStep('auth')}
          />
        )}

        {step === 'auth' && (
          <StepAuth
            siteId={site.id}
            primaryColor={site.primaryColor}
            onSuccess={handleAuthSuccess}
          />
        )}

        {step === 'plans' && (
          <StepPlans
            plans={plans}
            auth={auth!}
            primaryColor={site.primaryColor}
            onSelect={handlePlanSelected}
          />
        )}

        {step === 'payment' && selectedPlan && auth && (
          <StepPayment
            siteId={site.id}
            siteSlug={slug}
            userId={auth.userId}
            plan={selectedPlan}
            mac={portalParams.mac}
            apMac={portalParams.apMac}
            ssid={portalParams.ssid}
            redirectUrl={portalParams.redirectUrl}
            demoMode={portalParams.demoMode}
            primaryColor={site.primaryColor}
            whatsappSupport={site.whatsappSupport}
            onPaymentInitiated={handlePaymentInitiated}
            onSuccess={handleSuccess}
            onBack={() => setStep('plans')}
          />
        )}

        {step === 'success' && (
          <StepSuccess
            site={site}
            plan={selectedPlan}
            auth={auth}
            transactionId={transactionId}
            mac={portalParams.mac}
            apMac={portalParams.apMac}
            ssid={portalParams.ssid}
            redirectUrl={portalParams.redirectUrl}
            demoMode={portalParams.demoMode}
          />
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="text-center py-3 text-xs" style={{ color: 'var(--pc-muted)' }}>
        PremiumConnect — WiFi Sénégal tous droits réservés
      </footer>
    </div>
  );
}
