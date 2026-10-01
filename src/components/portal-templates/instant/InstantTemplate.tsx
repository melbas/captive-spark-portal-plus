/**
 * InstantTemplate — portage production du prototype INSTANT du labo
 * (portal-lab/index.html #v-instant, lignes 716-875).
 *
 * Parcours (vues internes) : accueil forfaits → auth tel/code (gratuit) →
 * paiement wallet (payant) → connecté (jauge + bouton vers l'URL de succès UniFi).
 *
 * Règles de portage :
 *  - Les data-attributes en dur du labo (data-min / data-price / data-id) sont
 *    remplacés par les forfaits RÉELS de la DB : getWifiPlans(siteId) →
 *    duration_min / price_fcfa / id / name.
 *  - Forfait gratuit (price_fcfa = 0) → parcours OTP via le composant AuthBox
 *    EXISTANT (Edge send-otp / verify-otp — l'OTP n'est JAMAIS réinventé ici).
 *  - Forfait payant → paiement wallet via create-charge (Edge provider-agnostic :
 *    Wave / Orange Money / Bictorys selon le provider configuré du site).
 *  - Aucun timer/fake backend du labo : la jauge de l'écran connecté décompte
 *    la VRAIE durée du forfait acheté.
 *  - Le branchement route/template (Portal.tsx / WifiPortalContainer) se fait
 *    dans une autre tâche : ce composant reçoit ses props du parent.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './instant.css';
import { supabase } from '@/integrations/supabase/client';
import { getWifiPlans } from '@/lib/supabase/portalQueries';
import AuthBox from '@/components/AuthBox';
import { wifiPortalService } from '@/services/wifi-portal-service';
import type { PortalPlan } from '@/lib/supabase/portalQueries';

export interface InstantTemplateProps {
  /** ID du site courant (résolu par le parent depuis le slug du portail). */
  siteId: string;
  /**
   * URL de succès du portail UniFi (param `id`/`linklogin` → redirect vers
   * l'accès autorisé). Fournie par le parent ; le bouton "Continuer" de
   * l'écran connecté y envoie l'utilisateur une fois la session active.
   */
  successUrl?: string;
  /** Adresse MAC du client (captive portal) — transmise aux Edge Functions. */
  mac?: string | null;
  /** Nom de marque affiché en topbar (défaut : PremiumConnect, cf. charte labo). */
  brandName?: string;
  /** Callback parent après connexion réussie (free OU payant). */
  onConnected?: (info: { plan: PortalPlan; phone?: string; amountFcfa: number }) => void;
}

type View = 'home' | 'auth' | 'pay' | 'done';

const PAY_METHODS = [
  { id: 'wave_money', logo: 'W', label: 'Wave', sub: 'Recommandé · sans frais', color: '#1DC8FF' },
  { id: 'orange_money', logo: 'OM', label: 'Orange Money', sub: 'Tous comptes Orange', color: '#FF7900' },
  { id: 'card', logo: 'CB', label: 'Carte bancaire', sub: 'Via Bictorys · sécurisé', color: '#191933' },
] as const;

type MethodId = (typeof PAY_METHODS)[number]['id'];

/** 20 min → "20 min" ; 1440 → "24 heures" ; 10080 → "7 jours" (labo). */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return Number.isInteger(h) ? `${h} heure${h > 1 ? 's' : ''}` : `${h} h`;
  }
  const d = minutes / 1440;
  if (Number.isInteger(d)) return `${d} jour${d > 1 ? 's' : ''}`;
  const w = minutes / 10080;
  return Number.isInteger(w) ? `${w} semaine${w > 1 ? 's' : ''}` : `${Math.round(d)} jours`;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  star: (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.5-.5z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  day: (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="18" r="9" />
      <path d="M4 18a8 8 0 1 1 16 0M12 3v3M5.5 8.5L7 10M18.5 8.5L17 10" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
};

function planIcon(plan: PortalPlan): React.ReactNode {
  if ((plan.price_fcfa ?? 0) === 0) return PLAN_ICONS.star;
  const m = plan.duration_min ?? 60;
  if (m < 60) return PLAN_ICONS.star;
  if (m < 1440) return PLAN_ICONS.clock;
  if (m < 10080) return PLAN_ICONS.day;
  return PLAN_ICONS.calendar;
}

export default function InstantTemplate({
  siteId,
  successUrl,
  mac,
  brandName = 'PremiumConnect',
  onConnected,
}: InstantTemplateProps) {
  const [plans, setPlans] = useState<PortalPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');

  // Paiement
  const [method, setMethod] = useState<MethodId>('wave_money');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Session connectée (free OU payant) — vrai temps restant, pas un fake timer.
  const [session, setSession] = useState<{
    plan: PortalPlan;
    phone?: string;
    amountFcfa: number;
    startedAt: number;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Grille des forfaits = VRAIE source DB (remplace les data-attributes du labo).
  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    setPlansError(null);
    getWifiPlans(siteId)
      .then((rows) => {
        if (cancelled) return;
        setPlans(rows);
        setLoadingPlans(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setPlansError(e.message || 'Impossible de charger les forfaits');
        setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId],
  );
  const isFree = (selected?.price_fcfa ?? 0) === 0;

  // Jauge de l'écran connecté : décompte réel de la durée du forfait acheté.
  useEffect(() => {
    if (!session) return;
    const totalSec = (session.plan.duration_min ?? 0) * 60;
    const tick = () => {
      const elapsed = (Date.now() - session.startedAt) / 1000;
      setSecondsLeft(Math.max(0, totalSec - elapsed));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [session]);

  const finishSession = useCallback(
    (plan: PortalPlan, phone: string | undefined, amountFcfa: number) => {
      setSession({ plan, phone, amountFcfa, startedAt: Date.now() });
      setView('done');
      onConnected?.({ plan, phone, amountFcfa });
    },
    [onConnected],
  );

  /**
   * Chemin GRATUIT (price_fcfa = 0) : AuthBox gère tel + code via les Edge
   * send-otp / verify-otp. Le callback reçoit l'identité vérifiée ; on crée
   * la session via le service existant (createUser → verify-otp sous
   * VITE_USE_EDGE_AUTH, puis createSession).
   */
  const handleFreeAuth = useCallback(
    async (authMethod: 'sms' | 'email', data: { phoneNumber?: string; email?: string; code: string }) => {
      if (!selected) return;
      const user = {
        auth_method: authMethod,
        phone: data.phoneNumber,
        email: data.email,
        code: data.code,
        site_id: siteId,
        mac_address: mac ?? undefined,
      };
      const created = await wifiPortalService.createUser(user);
      if (!created?.id) throw new Error('Création de la session impossible');
      await wifiPortalService.createSession({
        user_id: created.id,
        duration_minutes: selected.duration_min ?? 20,
      });
      finishSession(selected, data.phoneNumber ?? data.email, 0);
    },
    [selected, siteId, mac, finishSession],
  );

  /** Chemin PAYANT : create-charge (provider du site : Wave / OM / Bictorys). */
  const handlePay = useCallback(async () => {
    if (!selected) return;
    setPaying(true);
    setPayError(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-charge', {
        body: {
          planId: selected.id,
          siteId,
          method,
          mac: mac ?? undefined,
        },
      });
      if (error || !data || data.error) {
        throw new Error((data && data.error) || error?.message || 'Paiement impossible');
      }
      // Paiement ASYNCHRONE : le provider renvoie une URL de checkout (Wave /
      // Bictorys hosted page) — on y envoie l'utilisateur, le webhook active
      // la session côté serveur. Sinon (provider sans redirect, ex. USSD
      // confirmé), on considère la charge acceptée et on affiche l'accès.
      const redirectUrl: string | null = data.redirectUrl ?? data.link ?? data.paymentUrl ?? null;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      finishSession(selected, undefined, selected.price_fcfa ?? 0);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Paiement impossible');
    } finally {
      setPaying(false);
    }
  }, [selected, siteId, method, mac, finishSession]);

  const reset = useCallback(() => {
    setSelectedId(null);
    setSession(null);
    setView('home');
  }, []);

  const ctaLabel = selected
    ? isFree
      ? `Continuer avec ${selected.name || 'Gratuit'}`
      : `Acheter ${formatDuration(selected.duration_min ?? 60)} · ${selected.price_fcfa ?? 0} F`
    : 'Choisis un forfait';

  const gaugePct = session?.plan.duration_min
    ? Math.max(0, Math.min(100, (secondsLeft / ((session.plan.duration_min * 60) || 1)) * 100))
    : 0;

  return (
    <section className="pc-instant" data-template="instant">
      <div className="inner">
        {/* ---------- topbar ---------- */}
        <div className="in2-top">
          <span className="in2-brand">
            <span className="dot">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0" />
                <circle cx="12" cy="19.5" r="1.4" fill="#fff" stroke="none" />
              </svg>
            </span>
            {brandName}
          </span>
          <span className="in2-lang">FR</span>
        </div>

        {/* ---------- 1 · ACCUEIL / FORFAITS ---------- */}
        <div className={`in2-view ${view === 'home' ? 'show' : ''}`} data-testid="instant-home">
          <div className="in2-hero rise in">
            <h1>
              Choisis ton
              <br />
              <b>forfait internet</b>
            </h1>
            <p>Prix affiché, durée affichée. Aucune surprise au paiement.</p>
          </div>

          {loadingPlans && (
            <p className="in2-hint" data-testid="instant-loading">
              Chargement des forfaits…
            </p>
          )}
          {plansError && (
            <div className="in2-note" data-testid="instant-error" role="alert">
              <b>Erreur</b> : {plansError}
            </div>
          )}

          {!loadingPlans && !plansError && (
            <div className="in2-packs" data-testid="instant-packs">
              {plans.map((plan) => {
                const free = (plan.price_fcfa ?? 0) === 0;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className={`in2-pack btn-press rise in ${free ? 'free' : ''} ${
                      plan.id === selectedId ? 'sel' : ''
                    }`}
                    data-testid={`instant-plan-${plan.id}`}
                    data-plan-id={plan.id}
                    data-duration-minutes={plan.duration_min ?? ''}
                    data-price-fcfa={plan.price_fcfa ?? ''}
                    onClick={() => setSelectedId(plan.id)}
                  >
                    {free && <span className="badge-free">SPONSOR</span>}
                    <span className="ic">{planIcon(plan)}</span>
                    <span>
                      <span className="t">{plan.name}</span>
                      <span className="d">
                        {formatDuration(plan.duration_min ?? 60)} ·{' '}
                        {free ? 'regarde 5s le sponsor' : 'accès immédiat après paiement'}
                      </span>
                    </span>
                    <span className="price">
                      <span className="p">{free ? '0 F' : `${plan.price_fcfa} F`}</span>
                      <span className="u">{formatDuration(plan.duration_min ?? 60)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="in2-note">
            <b>Offre gratuite</b> : identification par SMS exigée (le réseau est offert, la loi
            veut qu'on sache qui s'y connecte).
            <br />
            <b>Forfaits payants</b> : pas de SMS — c'est ton wallet (Wave, Orange) qui valide le
            paiement et active le forfait.
          </div>

          {/* CTA fixe : récapitule la sélection (ex. « Acheter 1 heure · 200 F ») */}
          <div className="in2-cta">
            <button
              type="button"
              className={`in2-build ${selected ? 'live' : ''}`}
              data-testid="instant-cta"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setPayError(null);
                setView(isFree ? 'auth' : 'pay');
              }}
            >
              <span>{ctaLabel}</span>
            </button>
            <p className="in2-hint">Paiement sécurisé · reçu par SMS · sans engagement</p>
          </div>
        </div>

        {/* ---------- 2 · AUTH (gratuit uniquement — AuthBox existant) ---------- */}
        {view === 'auth' && (
          <div className="in2-view show" data-testid="instant-auth">
            <button type="button" className="in2-back btn-press" onClick={() => setView('home')}>
              ← Retour
            </button>
            <div className="in2-hero rise in">
              <h1>
                Ton
                <br />
                <b>numéro de téléphone</b>
              </h1>
              <p>
                C'est ton compte. On t'envoie un code par SMS pour confirmer — identification
                obligatoire pour le réseau offert.
              </p>
            </div>
            <AuthBox onAuth={handleFreeAuth} />
          </div>
        )}

        {/* ---------- 3 · PAIEMENT (payant uniquement) ---------- */}
        {view === 'pay' && selected && (
          <div className="in2-view show" data-testid="instant-pay">
            <button type="button" className="in2-back btn-press" onClick={() => setView('home')}>
              ← Retour
            </button>
            <div className="in2-hero rise in">
              <h1>
                Règle ton
                <br />
                <b>forfait</b>
              </h1>
              <p>Tu vois le montant exact avant de valider. C'est le wallet qui active le forfait.</p>
            </div>

            <div className="in2-sum" data-testid="instant-summary">
              <div className="r">
                <span>Forfait</span>
                <b>
                  {selected.name} · {formatDuration(selected.duration_min ?? 60)}
                </b>
              </div>
              <div className="r tot">
                <span>Total</span>
                <b>{selected.price_fcfa} F</b>
              </div>
            </div>

            <div className="in2-sec">
              <span>Mode de paiement</span>
              <i />
            </div>
            <div className="in2-pays" data-testid="instant-methods">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`in2-pay btn-press ${m.id === method ? 'sel' : ''}`}
                  data-testid={`instant-method-${m.id}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="logo" style={{ background: m.color }}>
                    {m.logo}
                  </span>
                  <span>
                    <span className="nm">{m.label}</span>
                    <span className="sub">{m.sub}</span>
                  </span>
                  <span className="tick">
                    <svg viewBox="0 0 24 24" strokeWidth="3.4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>

            {payError && (
              <div className="in2-note" role="alert" data-testid="instant-pay-error">
                <b>Paiement</b> : {payError}
              </div>
            )}

            <div className="in2-cta inline">
              <button
                type="button"
                className="in2-build live btn-press"
                data-testid="instant-pay-button"
                disabled={paying}
                onClick={handlePay}
              >
                {paying ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>Paiement en cours…</span>
                  </>
                ) : (
                  <span>Payer {selected.price_fcfa} F</span>
                )}
              </button>
              <p className="in2-hint">
                Le forfait s'active tout seul dès que le wallet confirme.
              </p>
            </div>
          </div>
        )}

        {/* ---------- 4 · CONNECTÉ ---------- */}
        {view === 'done' && session && (
          <div className="in2-view show" data-testid="instant-done">
            <div className="in2-on">
              <div className="ring rise in">
                <svg viewBox="0 0 24 24" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="rise in">Tu es connecté</h2>
              <p className="meta rise in">
                Forfait <b>{session.plan.name}</b> actif
              </p>
              <p className="meta rise in mono" data-testid="instant-clock">
                <b>{formatClock(secondsLeft)}</b>
              </p>

              {/* Jauge de temps restant (vraie durée du forfait acheté) */}
              <div className="in2-gauge rise in" data-testid="instant-gauge">
                <div className="track">
                  <div className="fill" style={{ width: `${gaugePct}%` }} />
                </div>
                <div className="legend">
                  <span>Temps restant</span>
                  <span>{formatDuration(session.plan.duration_min ?? 0)} au total</span>
                </div>
              </div>

              <div className="row rise in">
                <div className="stat">
                  <p className="k">Identité</p>
                  <p className="v mono">{session.phone ? maskPhone(session.phone) : 'Wallet'}</p>
                </div>
                <div className="stat">
                  <p className="k">Reçu</p>
                  <p className="v">{session.amountFcfa > 0 ? `${session.amountFcfa} F` : 'Offert'}</p>
                </div>
              </div>

              {successUrl && (
                <button
                  type="button"
                  className="in2-go btn-press"
                  data-testid="instant-success"
                  onClick={() => {
                    window.location.href = successUrl;
                  }}
                >
                  Continuer vers internet
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M4 12h15M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <button type="button" className="in2-back btn-press" onClick={reset}>
                ↺ Refaire le parcours
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Masque un numéro E.164 pour l'affichage : +221771234567 → +221 •••4567. */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 4)} •••${phone.slice(-4)}`;
}
