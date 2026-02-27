import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { readUnifiParams } from '@/lib/portal-params';
import type { PortalConfig, UnifiParams } from '@/types/premiumconnect';
import PortalWelcome from '@/components/portal/PortalWelcome';
import PortalAuth from '@/components/portal/PortalAuth';
import PortalPlans from '@/components/portal/PortalPlans';
import PortalPayment from '@/components/portal/PortalPayment';
import PortalAccess from '@/components/portal/PortalAccess';
import PortalNoAccess from '@/components/portal/PortalNoAccess';
import PortalDemoBanner from '@/components/portal/PortalDemoBanner';
import { useLanguage } from '@/components/LanguageContext';
import { Wifi } from 'lucide-react';

export type PortalStep = 'welcome' | 'auth' | 'plans' | 'payment' | 'access';

export default function Portal() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const [step, setStep] = useState<PortalStep>('welcome');
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unifiParams, setUnifiParams] = useState<UnifiParams | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const isDemo = searchParams.has('demo');

  // Load site config + UniFi params
  useEffect(() => {
    const params = readUnifiParams();
    setUnifiParams(params);

    async function loadConfig() {
      if (!slug) { setError('Slug manquant'); setLoading(false); return; }

      const { data: site, error: siteErr } = await supabase
        .from('sites')
        .select('*')
        .eq('portal_slug', slug)
        .eq('is_active', true)
        .single();

      if (siteErr || !site) {
        setError('Site introuvable ou inactif');
        setLoading(false);
        return;
      }

      const { data: plans } = await supabase
        .from('wifi_plans')
        .select('*')
        .eq('site_id', site.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setConfig({
        siteId: site.id,
        siteName: site.name,
        portalSlug: site.portal_slug,
        logoUrl: site.logo_url,
        primaryColor: site.primary_color || '#5B4DFF',
        welcomeMsg: site.welcome_msg || 'Bienvenue !',
        whatsappSupport: site.whatsapp_support,
        plans: (plans || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          durationMin: p.duration_min,
          priceFcfa: p.price_fcfa,
          speedDownMb: p.speed_down_mb,
          speedUpMb: p.speed_up_mb,
          dataLimitMb: p.data_limit_mb,
          maxDevices: p.max_devices,
          isPopular: p.is_popular,
        })),
      });
      setLoading(false);
    }

    loadConfig();
  }, [slug]);

  // No MAC and not demo → block
  if (!loading && !error && unifiParams && !unifiParams.mac && !isDemo) {
    return <PortalNoAccess />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center">
          <Wifi className="h-10 w-10 text-brand-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center p-8">
          <p className="text-status-error font-semibold">{error || 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  const selectedPlan = config.plans.find(p => p.id === selectedPlanId) || null;

  return (
    <div className="min-h-screen bg-surface-light flex flex-col">
      {isDemo && <PortalDemoBanner />}

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {step === 'welcome' && (
          <PortalWelcome config={config} onConnect={() => setStep('auth')} />
        )}

        {step === 'auth' && (
          <PortalAuth
            siteId={config.siteId}
            onAuthenticated={(uid) => { setUserId(uid); setStep('plans'); }}
            onBack={() => setStep('welcome')}
          />
        )}

        {step === 'plans' && (
          <PortalPlans
            plans={config.plans}
            onSelect={(planId) => { setSelectedPlanId(planId); setStep('payment'); }}
            onBack={() => setStep('auth')}
          />
        )}

        {step === 'payment' && selectedPlan && (
          <PortalPayment
            plan={selectedPlan}
            siteId={config.siteId}
            userId={userId!}
            mac={unifiParams?.mac || 'demo-mac'}
            onSuccess={() => setStep('access')}
            onBack={() => setStep('plans')}
          />
        )}

        {step === 'access' && selectedPlan && (
          <PortalAccess
            plan={selectedPlan}
            redirectUrl={unifiParams?.redirectUrl || 'http://www.google.com'}
          />
        )}
      </main>

      <footer className="text-center py-4 text-sm text-muted-foreground">
        WIFI-Sénégal — tous droits réservés
      </footer>
    </div>
  );
}
