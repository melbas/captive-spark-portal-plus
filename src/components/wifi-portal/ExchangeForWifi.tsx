import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageContext";
import { toast } from "sonner";
import {
  HelpCircle,
  Star,
  Share2,
  X,
  Check,
  Clock,
  ArrowRight,
  Copy,
} from "lucide-react";

/**
 * EXCHANGE — le troc explicite et transparent.
 *
 * Rationale produit : au lieu d'imposer UNE forme d'engagement (vidéo OU quiz),
 * l'utilisateur CHOISIT son échange contre du temps. Il voit le gain avant de
 * s'engager, la promesse est tenue immédiatement. C'est le modèle "Échange" du
 * laboratoire portal-lab, adapté au design system du portail.
 *
 * Motion : standards Emil Kowalski — courbes custom, <300ms UI, transform/opacity
 * uniquement, reduced-motion respecté, hover gated pour les pointeurs précis.
 */

// ============================================================
// Motion tokens (cohérents avec le système de design du portail)
// ============================================================
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

// Entrée en scène : transition (interruptible), pas de keyframes.
// @starting-style est géré via une classe utilitaire du CSS global.
const riseStyle: React.CSSProperties = {
  transition: `opacity 320ms ${EASE_OUT}, transform 320ms ${EASE_OUT}`,
};

// ============================================================
// Types
// ============================================================
type DealKind = "quiz" | "sponsor" | "referral";

interface ExchangeDeal {
  kind: DealKind;
  /** i18n keys pour le titre et la description */
  titleKey: string;
  descKey: string;
  gain: number;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const DEALS: ExchangeDeal[] = [
  {
    kind: "quiz",
    titleKey: "exchangeQuizTitle",
    descKey: "exchangeQuizDesc",
    gain: 10,
    Icon: HelpCircle,
    iconColor: "text-violet-300",
    iconBg: "bg-violet-500/15",
  },
  {
    kind: "sponsor",
    titleKey: "exchangeSponsorTitle",
    descKey: "exchangeSponsorDesc",
    gain: 20,
    Icon: Star,
    iconColor: "text-amber-300",
    iconBg: "bg-amber-500/15",
  },
  {
    kind: "referral",
    titleKey: "exchangeReferralTitle",
    descKey: "exchangeReferralDesc",
    gain: 15,
    Icon: Share2,
    iconColor: "text-emerald-300",
    iconBg: "bg-emerald-500/15",
  },
];

// ============================================================
// Quiz : une question, feedback immédiat
// ============================================================
const QUIZ = {
  questionKey: "exchangeQuizQuestion",
  options: [
    { labelKey: "exchangeQuizOptA", correct: true },
    { labelKey: "exchangeQuizOptB", correct: false },
    { labelKey: "exchangeQuizOptC", correct: false },
  ],
};

interface ExchangeForWifiProps {
  /** Appelé avec les minutes gagnées dès qu'un échange est honoré */
  onTimeAwarded: (minutes: number) => void;
  /** Appelé quand l'utilisateur a fini (échange complété ou choix de se connecter) */
  onComplete?: () => void;
  /** Code de parrainage de l'utilisateur (s'il en a déjà un) */
  referralCode?: string;
  userData?: any;
}

const ExchangeForWifi: React.FC<ExchangeForWifiProps> = ({
  onTimeAwarded,
  onComplete,
  referralCode,
}) => {
  const { t } = useLanguage();
  const [chosen, setChosen] = useState<DealKind | null>(null);
  const [earned, setEarned] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sponsorCount, setSponsorCount] = useState(5);

  // ---- Génération du code de parrainage (stable par session) ----
  const generatedReferral = useRef<string>(
    referralCode ??
      "WIFI-" + Math.random().toString(36).slice(2, 6).toUpperCase()
  );

  // ---- Minuteur du sponsor ----
  useEffect(() => {
    if (chosen !== "sponsor") return;
    setSponsorCount(5);
    const id = setInterval(() => {
      setSponsorCount((c) => {
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [chosen]);

  // ---- Récompense ----
  const award = (deal: ExchangeDeal) => {
    setEarned((e) => e + deal.gain);
    onTimeAwarded(deal.gain);
    toast.success(
      t("exchangeRewardToast").replace("{minutes}", String(deal.gain))
    );
  };

  // ---- Quiz : validation d'une réponse ----
  const handleQuizAnswer = (optIdx: number) => {
    if (answered) return;
    setAnswered(true);
    const opt = QUIZ.options[optIdx];
    if (opt.correct) {
      const deal = DEALS.find((d) => d.kind === "quiz")!;
      award(deal);
    }
  };

  // ---- Parrainage : copie du code ----
  const handleCopy = async () => {
    if (copied) return;
    const code = generatedReferral.current;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error("clipboard API unavailable");
      }
    } catch {
      // Repli : textarea + execCommand (mobile ancien / contexte non sécurisé)
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* on déclare copié quand même : l'utilisateur voit le code */
      }
      ta.remove();
    }
    setCopied(true);
    const deal = DEALS.find((d) => d.kind === "referral")!;
    award(deal);
  };

  // ---- Sélection d'un échange ----
  const handleChoose = (kind: DealKind) => {
    setChosen(kind);
    setAnswered(false);
    setCopied(false);
  };

  // ---- Retour à la liste des échanges ----
  const handleBack = () => {
    setChosen(null);
    setAnswered(false);
    setCopied(false);
  };

  const activeDeal = chosen ? DEALS.find((d) => d.kind === chosen) : null;

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      <CardContent className="p-6">
        {/* ---------- En-tête ---------- */}
        <div style={riseStyle} className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("exchangeTitle")}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("exchangeHeading")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("exchangeSubheading")}
          </p>
          {/* Compteur de temps gagné */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold tabular-nums">
              {earned} {t("minutes")}
            </span>
          </div>
        </div>

        {/* ---------- Liste des échanges ---------- */}
        {!chosen && (
          <div className="space-y-3">
            {DEALS.map((deal, idx) => (
              <button
                key={deal.kind}
                onClick={() => handleChoose(deal.kind)}
                style={{
                  ...riseStyle,
                  transitionDelay: `${idx * 60}ms`,
                }}
                className="group w-full text-left"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-4 transition-colors duration-200 hover:bg-accent/5 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${deal.iconBg}`}
                  >
                    <deal.Icon className={`h-5 w-5 ${deal.iconColor}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold">
                      {t(deal.titleKey)}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t(deal.descKey)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-emerald-500">
                    +{deal.gain} {t("minutes")}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-safe:group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ---------- Zone d'échange actif ---------- */}
        {chosen && (
          <div style={riseStyle} className="space-y-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground active:scale-[0.97] motion-safe:transition-transform motion-safe:duration-150"
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </button>

            {/* ---------- QUIZ ---------- */}
            {chosen === "quiz" && (
              <div className="space-y-4">
                <p className="text-base font-medium leading-snug">
                  {t(QUIZ.questionKey)}
                </p>
                <div className="space-y-2">
                  {QUIZ.options.map((opt, idx) => {
                    const showResult = answered;
                    const isCorrect = showResult && opt.correct;
                    const isWrongPick =
                      showResult && !opt.correct && false; // pas de sélection incorrecte traquée
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(idx)}
                        disabled={answered}
                        className={[
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors duration-200",
                          showResult && opt.correct
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-border bg-card/50 hover:bg-accent/5",
                          answered ? "cursor-default" : "active:scale-[0.98]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                            isCorrect
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {showResult && opt.correct ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            "ABC"[idx]
                          )}
                        </span>
                        <span className="flex-1">{t(opt.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <p className="text-sm text-muted-foreground">
                    {t("exchangeQuizAnswered")}
                  </p>
                )}
              </div>
            )}

            {/* ---------- SPONSOR : compte à rebours 5s ---------- */}
            {chosen === "sponsor" && (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  {/* Anneau de progression */}
                  <svg
                    className="absolute inset-0 -rotate-90"
                    viewBox="0 0 112 112"
                    aria-hidden
                  >
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      fill="none"
                      strokeWidth="6"
                      className="stroke-muted"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      className="stroke-primary transition-all duration-1000 ease-linear"
                      style={{
                        strokeDasharray: 2 * Math.PI * 48,
                        strokeDashoffset:
                          2 * Math.PI * 48 * (1 - (5 - sponsorCount) / 5),
                      }}
                    />
                  </svg>
                  <span className="text-3xl font-bold tabular-nums">
                    {sponsorCount}
                  </span>
                </div>
                <p className="text-center text-sm text-muted-foreground leading-relaxed">
                  {t("exchangeSponsorBody")}
                </p>
                {sponsorCount === 0 && (
                  <div
                    style={riseStyle}
                    className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400"
                  >
                    <Check className="h-4 w-4" />
                    {t("exchangeSponsorDone")}
                  </div>
                )}
              </div>
            )}

            {/* ---------- PARRAINAGE : code + copie ---------- */}
            {chosen === "referral" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-4">
                  <code className="flex-1 font-mono text-lg font-bold tracking-wider">
                    {generatedReferral.current}
                  </code>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    variant={copied ? "outline" : "default"}
                    className={[
                      "transition-colors duration-200",
                      copied && "border-emerald-500/40 text-emerald-400",
                    ].join(" ")}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {t("exchangeCopied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        {t("exchangeCopy")}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("exchangeReferralBody")}
                </p>
              </div>
            )}

            {/* ---------- Connexion finale ---------- */}
            {earned > 0 && (
              <div style={riseStyle} className="pt-2">
                <Button
                  onClick={() => onComplete?.()}
                  className="w-full h-12 text-base font-semibold"
                >
                  {t("exchangeConnect")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExchangeForWifi;
