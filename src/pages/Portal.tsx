import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { readUnifiParams } from '@/lib/portal-params';
import { getSiteBySlug, getWifiPlans, getPortalConfig } from '@/lib/supabase/portalQueries';
import type { PortalConfig, UnifiParams } from '@/types/premiumconnect';
import PortalWelcome from '@/components/portal/PortalWelcome';
import PortalAuth from '@/components/portal/PortalAuth';
import PortalPlans from '@/components/portal/PortalPlans';
import PortalPayment from '@/components/portal/PortalPayment';
import PortalAccess from '@/components/portal/PortalAccess';
import PortalNoAccess from '@/components/portal/PortalNoAccess';
import PortalDemoBanner from '@/components/portal/PortalDemoBanner';
import WifiPortalContainer from '@/components/wifi-portal/WifiPortalContainer';
import InstantTemplate from '@/components/portal-templates/instant/InstantTemplate';
import SceneTemplate from '@/components/portal-templates/scene/SceneTemplate';
import EchangeTemplate from '@/components/portal-templates/echange/EchangeTemplate';
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
  const [authPhone, setAuthPhone] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  /** Template choisi pour le site (migration 20260930000000) : instant | scene | echange. */
  const [portalTemplate, setPortalTemplate] = useState<string>('instant');
  /** Props du template scène, issues de sites + portal_config. */
  const [sceneProps, setSceneProps] = useState<Record<string, string | null>>({});

  // Le site de démo est toujours accessible sans paramètres UniFi (tests bout en bout)
  const isDemo = searchParams.has('demo') || slug === 'demo';

  // Site démo = design complet identique au portail racine (slides, ads vidéo/audio, jeux)
  if (slug === 'demo') {
    return (
      <>
        <PortalDemoBanner />
        <WifiPortalContainer />
      </>
    );
  }

  // Load site config + UniFi params
  useEffect(() => {
    const params = readUnifiParams();
    setUnifiParams(params);

    async function loadConfig() {
      if (!slug) { setError('Slug manquant'); setLoading(false); return; }

      let site;
      try {
        site = await getSiteBySlug(slug);
      } catch {
        setError('Site introuvable ou inactif');
        setLoading(false);
        return;
      }

      const [plans, portalCfg] = await Promise.all([
        getWifiPlans(site.id),
        getPortalConfig(site.id),
      ]);

      setConfig({
        siteId: site.id,
        siteName: site.name ?? site.portal_slug ?? slug,
        portalSlug: site.portal_slug ?? slug,
        // La config publiée prime sur la fiche site (chaîne de priorité).
        logoUrl: portalCfg?.logo_url ?? site.logo_url,
        primaryColor: portalCfg?.theme_color ?? (site.primary_color || '#5B4DFF'),
        welcomeMsg: portalCfg?.welcome_message ?? site.welcome_msg ?? 'Bienvenue !',
        plans: (plans || []).map((p) => ({
          id: p.id,
          name: p.name,
          durationMin: p.duration_min ?? 0,
          priceFcfa: p.price_fcfa ?? 0,
          speedDownMb: p.speed_down_mb ?? 0,
          speedUpMb: p.speed_up_mb ?? 0,
          dataLimitMb: p.data_limit_mb,
          maxDevices: p.max_devices ?? 1,
          isPopular: p.is_popular ?? false,
        })),
      });
      // Template choisi pour ce site. Toute valeur absente/inconnue/null →
      // fallback = portail actuel (WifiPortalContainer) : les sites sans
      // template CHOISI ne changent pas jusqu'à validation des nouveaux
      // templates (contract : seul un choix explicite 'instant' active
      // InstantTemplate).
      setPortalTemplate(
        ['scene', 'echange', 'instant'].includes(site.portal_template ?? '')
          ? site.portal_template!
          : 'legacy',
      );
      // Données propres au template scène (event/sponsor) : customizations de la
      // config publiée quand elle existe, sinon champs de la fiche site.
      setSceneProps({
        event_name: portalCfg?.portal_name ?? site.name,
        event_tagline: null,
        sponsor_name: site.name,
        sponsor_logo_url: portalCfg?.logo_url ?? site.logo_url,
        event_dates: null,
        event_location: site.location,
        offer_text: portalCfg?.welcome_message ?? site.welcome_msg,
        siteId: site.id,
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

  // ---- Routeur de templates (migration 20260930000000) ----
  // 'scene'   → template événementiel (portage labo #v-scene).
  // 'echange' → template échange (PremiumConnect, portage labo #v-echange).
  // 'instant' → template Instant (portage labo #v-instant), sur choix explicite.
  // Défaut ('legacy' : null, valeur inconnue, site sans template choisi) →
  // portail actuel (WifiPortalContainer), comportement inchangé.
  if (portalTemplate === 'scene') {
    return <SceneTemplate {...sceneProps} />;
  }
  if (portalTemplate === 'echange') {
    return <EchangeTemplate siteId={config.siteId} />;
  }
  if (portalTemplate === 'instant') {
    return (
      <InstantTemplate
        siteId={config.siteId}
        mac={unifiParams?.mac || null}
        successUrl={unifiParams?.redirectUrl}
      />
    );
  }

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
            onAuthenticated={(uid, phone) => {
              setUserId(uid);
              // Numéro collecté à l'auth : pré-remplira le wallet de paiement
              // (l'utilisateur ne le ressaisit pas une 2e fois).
              setAuthPhone(phone ?? null);
              setStep('plans');
            }}
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
            // Pré-rempli depuis l'auth : l'utilisateur ne resaisit pas son numéro.
            phone={authPhone ?? undefined}
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
