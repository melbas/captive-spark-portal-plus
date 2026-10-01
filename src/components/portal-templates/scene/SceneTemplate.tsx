/**
 * SceneTemplate — portage du prototype « SCÈNE » (portal-lab #v-scene).
 *
 * Splash événementiel (nom, dates, lieu, sponsor) → bouton « Rejoindre » →
 * identification OTP (AuthBox, le vrai flux) → écran connecté : badge
 * « Connecté », pass journalier au format labo (TG-XXXX) + jauge de temps.
 *
 * Props issues de sites + portal_config (voir Portal.tsx) ; tous optionnels
 * avec valeurs par défaut du labo pour rester rendable sur un site peu configuré.
 */
import { useEffect, useMemo, useState } from 'react';
import AuthBox from '@/components/AuthBox';
import './scene.css';

export interface SceneTemplateProps {
  event_name?: string | null;
  event_tagline?: string | null;
  sponsor_name?: string | null;
  sponsor_logo_url?: string | null;
  event_dates?: string | null;
  event_location?: string | null;
  offer_text?: string | null;
  /** Sous-texte du bloc sponsor (distinct du lede/accueil). */
  sponsor_subtext?: string | null;
  /** Requis : contexte site pour send-otp / verify-otp (rate limiting). */
  siteId?: string | null;
}

/** Pass journalier au format labo : TG-XXXX (4 caractères A-Z0-9 sans ambiguïté). */
function generatePassCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const randoms = crypto.getRandomValues(new Uint8Array(4));
  for (let i = 0; i < 4; i++) code += alphabet[randoms[i] % alphabet.length];
  return `TG-${code}`;
}

/** Session offerte par défaut : 60 min (comme le labo). */
const SESSION_MINUTES = 60;

export default function SceneTemplate({
  event_name,
  event_tagline,
  sponsor_name,
  sponsor_logo_url,
  event_dates,
  event_location,
  offer_text,
  sponsor_subtext,
  siteId,
}: SceneTemplateProps) {
  const [connected, setConnected] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [passCode] = useState(generatePassCode);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_MINUTES * 60);

  // Jauge de temps : décompte une fois connecté (stoppe à zéro).
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(
      () => setSecondsLeft((s) => (s <= 0 ? s : s - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [connected]);

  const clock = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);
  const pct = Math.round((secondsLeft / (SESSION_MINUTES * 60)) * 100);

  const eventName = event_name || 'Festival Teranga 2026';
  const sponsorLabel = sponsor_name || 'Notre partenaire officiel';
  // Initiale dans le carré si pas de logo (comme le « W » du labo).
  const sponsorInitial = (sponsor_name || '?').trim().charAt(0).toUpperCase();

  if (connected) {
    return (
      <div className="sct">
        <div className="sct-atmos" aria-hidden="true" />
        <div className="sct-grain" aria-hidden="true" />
        <div className="sct-inner">
          <div className="sct-on" role="status">
            <span className="badge">✓ Connecté au réseau des Jeux</span>
            <h2>Bienvenue à<br />{eventName}</h2>
            <p className="meta">
              Internet actif sur tout le site ·{' '}
              <b className="mono" data-testid="scene-clock">{clock}</b> restantes
            </p>
            <div
              className="sct-juice"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Temps de connexion restant"
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="pass">
              <p className="k">Ton pass des Jeux</p>
              <p className="v mono" data-testid="scene-pass">{passCode}</p>
              <p className="s">Sert aussi de tirage au sort</p>
            </div>
            <button type="button" className="sct-reset" onClick={() => {
              setConnected(false);
              setShowAuth(false);
              setSecondsLeft(SESSION_MINUTES * 60);
            }}>
              ↺ Refaire le portail
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sct">
      <div className="sct-atmos" aria-hidden="true" />
      <div className="sct-grain" aria-hidden="true" />
      <div className="sct-inner">
        <div className="sct-top">
          <span className="kicker">WiFi public — Ville de Dakar</span>
          <span className="wifi">
            <span className="bar" /><span className="bar" /><span className="bar" /> Signal excellent
          </span>
        </div>

        <div className="sct-hero">
          <h1>
            {event_tagline || eventName.split(' ').slice(0, 1)}
            <span className="accent">{eventName}</span>
          </h1>
          <p className="date">
            {event_dates && <span>{event_dates}</span>}
            {event_dates && event_location && <span className="sep" />}
            {event_location && <span>{event_location}</span>}
          </p>
          <p className="lede">
            {offer_text ||
              `Le portail officiel de l'événement. Offert par notre partenaire, sur tout le site.`}
          </p>
        </div>

        <div className="sct-sponsor">
          <span className="logo">
            {sponsor_logo_url
              ? <img src={sponsor_logo_url} alt={sponsorLabel} />
              : sponsorInitial}
          </span>
          <span className="txt">
            <b>{sponsorLabel}</b>
            {sponsor_subtext || offer_text || 'Internet gratuit pendant l\'événement'}
          </span>
        </div>

        <div className="sct-cta">
          {!showAuth ? (
            <>
              <button
                type="button"
                className="sct-connect"
                data-testid="scene-join"
                onClick={() => setShowAuth(true)}
              >
                <span>Rejoindre le WiFi des Jeux</span>
                <svg
                  className="arrow"
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
              <p className="sct-fine">1h offerte · navigation illimitée · renouvelable</p>
              <div className="sct-rings" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
            </>
          ) : (
            <div className="sct-auth" data-testid="scene-auth">
              {/* Vrai flux d'identification : OTP (send-otp / verify-otp) puis session. */}
              <AuthBox
                onAuth={async () => {
                  // Identification validée → ouverture de la session scène.
                  setConnected(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
