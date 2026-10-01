/**
 * EchangeTemplate — portage React du prototype #v-echange (portal-lab,
 * lignes 922-1032 + handlers JS).
 *
 * Principe : Internet gratuit gagné en missions. La jauge affiche les MINUTES
 * gagnées (state local, aucun point — c'est le principe du prototype).
 * 1 mission honorée suffit à débloquer le CTA « Se connecter ».
 *
 * À la connexion : même chemin que le portail actuel — AuthBox (identification
 * SMS légale, OTP Edge send-otp/verify-otp, jamais de code en front) crée le
 * user via wifiPortalService.createUser (Edge verify-otp), puis une session
 * wifi_sessions est créée avec duration_minutes = minutes gagnées
 * (handleExtendTime-equivalent : session duration = temps gagné).
 */
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import "./echange.css";
import AuthBox from "@/components/AuthBox";
import { wifiPortalService, type WifiSession } from "@/services/wifi-portal-service";
import MissionsBoard, { MISSION_LABEL, type MissionKind } from "./MissionsBoard";
import MissionRunner from "./MissionRunner";

export interface EchangeTemplateProps {
  /** Objectif affiché sur la jauge (graduation max). Défaut : 30 min. */
  goalMinutes?: number;
  /** Site Supabase (quiz + pubs + OTP). Défaut : demo-site. */
  siteId?: string;
  /** Appelé après création du user + session créditées. */
  onConnected?: (info: { minutes: number; sessionId?: string; userId?: string }) => void;
}

/** Durée minimale de session si l'utilisateur se connecte avec 0 mission : impossible — CTA verrouillé. */
const UNLOCK_MIN_GAIN = 1; // 1 mission quelconque

function getMacAddress(): string {
  try {
    const existing = localStorage.getItem("simulated_mac_address");
    if (existing) return existing;
    const mac = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0"),
    ).join(":");
    localStorage.setItem("simulated_mac_address", mac);
    return mac;
  } catch {
    return "00:00:00:00:00:00";
  }
}

const EchangeTemplate: React.FC<EchangeTemplateProps> = ({
  goalMinutes = 30,
  siteId,
  onConnected,
}) => {
  const [earned, setEarned] = useState(0);
  const [doneKinds, setDoneKinds] = useState<Set<MissionKind>>(new Set());
  const [activeKind, setActiveKind] = useState<MissionKind | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState<{ minutes: number; mission: string } | null>(null);
  const [pop, setPop] = useState(false);

  const unlocked = doneKinds.size >= UNLOCK_MIN_GAIN;
  const fillPct = Math.min(100, (earned / goalMinutes) * 100);
  const markPct = Math.min(100, (10 / goalMinutes) * 100); // graduation à la première mission type (comme le labo 33%)

  const completeMission = useCallback((kind: MissionKind) => {
    setEarned((e) => e + (kind === "quiz" ? 10 : kind === "sponsor" ? 20 : kind === "ref" ? 15 : 5));
    setDoneKinds((prev) => {
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
    setActiveKind(null);
    setPop(true);
    setTimeout(() => setPop(false), 420);
  }, []);

  const handleAuth = useCallback(
    async (method: "sms" | "email", data: { phoneNumber?: string; email?: string; code: string }) => {
      setConnecting(true);
      try {
        // 1) User : même chemin que le portail actuel (AuthBox → verify-otp Edge).
        const createdUser = await wifiPortalService.createUser({
          auth_method: method,
          email: data.email,
          phone: data.phoneNumber,
          code: data.code,
          mac_address: getMacAddress(),
          site_id: siteId,
        });
        if (!createdUser?.id) {
          throw new Error("Failed to create user");
        }

        // 2) Session : duration_minutes = minutes gagnées (handleExtendTime-equivalent,
        //    ici au moment de la création de session — pas de table points).
        const sessionData: WifiSession = {
          user_id: createdUser.id,
          duration_minutes: Math.max(1, earned),
        };
        const session = await wifiPortalService.createSession(sessionData);
        if (!session) {
          // Gate volontaire du sessionService (API visiteur non validée) :
          // l'écran connecté s'affiche quand même côté template, mais on signale.
          console.warn("EchangeTemplate: session non créée (gate backend visiteur).");
        }

        setConnected({
          minutes: earned,
          mission:
            doneKinds.size > 1
              ? `${doneKinds.size} missions`
              : MISSION_LABEL[doneKinds.values().next().value ?? "quiz"],
        });
        onConnected?.({
          minutes: earned,
          sessionId: session?.id,
          userId: createdUser.id,
        });
        toast.success(`Vous êtes connecté — ${earned} min de navigation offertes.`);
      } catch (err) {
        console.error("EchangeTemplate connect error:", err);
        toast.error("Connexion impossible. Vérifie ton code et réessaie.");
      } finally {
        setConnecting(false);
      }
    },
    [earned, doneKinds, siteId, onConnected],
  );

  const clock = useMemo(() => {
    const total = connected ? connected.minutes * 60 : 0;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [connected]);

  return (
    <div className="ecx" data-testid="echange-template">
      {connected ? (
        <div className="ecx-inner">
          <div className="ec2-on" data-testid="ec-on">
            <div className="ring">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2>Tu es connecté</h2>
            <p className="meta">
              <b className="mono" data-testid="ec-clock">
                {clock}
              </b>{" "}
              de navigation offertes
            </p>
            <div className="row">
              <div className="stat">
                <p className="k">Mission faite</p>
                <p className="v" data-testid="ec-stat-kind">
                  {connected.mission}
                </p>
              </div>
              <div className="stat">
                <p className="k">Temps gagné</p>
                <p className="v mono" data-testid="ec-stat-gain">
                  +{connected.minutes} min
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ecx-inner">
            <div className="ec2-top">
              <span className="ec2-brand">
                <span className="dot">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0" />
                    <circle cx="12" cy="19.5" r="1.4" fill="#fff" stroke="none" />
                  </svg>
                </span>
                PremiumConnect
              </span>
              <span className="ec2-lang">FR</span>
            </div>

            <div className="ec2-hero">
              <h1>
                Internet gratuit,
                <br />
                <b>gagné en 1 mission.</b>
              </h1>
              <p>Choisis une mission ci-dessous. Le temps gagné s'ajoute tout de suite à ta jauge.</p>
            </div>

            {/* LA JAUGE */}
            <div className={`ec2-gauge${pop ? " pulse" : ""}`} data-testid="ec-gauge">
              <div className="row1">
                <span className="lbl">Ton temps WiFi</span>
                <span className="num mono" data-testid="ec-num">
                  {earned}
                  <small>min</small>
                </span>
              </div>
              <div className="ec2-track">
                <div className="ec2-fill" data-testid="ec-fill" style={{ width: `${fillPct}%` }} />
                <div className="ec2-mark" style={{ left: `${markPct}%` }} />
              </div>
              <div className="row2">
                <span>0 min</span>
                <span className="goal">
                  Objectif <b>{goalMinutes} min</b>
                </span>
              </div>
              <div className={`ec2-state${unlocked ? " ready" : ""}`}>
                <span className="lamp" />
                <span data-testid="ec-state-txt">
                  {unlocked
                    ? "Internet débloqué — tu peux te connecter"
                    : "Fais 1 mission pour débloquer internet"}
                </span>
              </div>
            </div>

            <div className="ec2-sec">
              <span>Choisis ta mission</span>
              <i />
            </div>

            <MissionsBoard doneKinds={doneKinds} onPick={setActiveKind} />

            {activeKind && (
              <MissionRunner
                kind={activeKind}
                siteId={siteId}
                onComplete={completeMission}
                onCancel={() => setActiveKind(null)}
              />
            )}

            {/* Identification SMS légale : obligatoire même en gratuit (le labo l'affiche) */}
            {unlocked && (
              <div className="ec2-auth" data-testid="ec-auth">
                <p className="ec2-auth-note">
                  Dernière étape : ton numéro sert à ouvrir la session (obligation légale,
                  même pour un accès gratuit). Code reçu par SMS — jamais stocké ici.
                </p>
                <AuthBox onAuth={handleAuth} />
              </div>
            )}
          </div>

          {/* CTA connexion fixe */}
          <div className="ec2-cta" data-testid="ec-cta">
            <button
              type="button"
              className={`ec2-connect${unlocked ? " live" : ""}${pop ? " pop" : ""}`}
              disabled={!unlocked || connecting}
              data-testid="ec-go"
              onClick={() => {
                if (unlocked) {
                  document
                    .getElementById("__ecx_auth_anchor")
                    ?.scrollIntoView({ behavior: "smooth" });
                  document
                    .querySelector("[data-testid='ec-auth']")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <span>
                {!unlocked
                  ? "Fais une mission pour te connecter"
                  : connecting
                    ? "Connexion…"
                    : `Se connecter · ${earned} min`}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EchangeTemplate;
