/**
 * MissionRunner — zone de tâche du prototype #v-echange : exécute la mission
 * choisie (quiz / sponsor / ref / havecode) puis appelle onComplete(kind).
 *
 * Branches réelles :
 * - quiz   : table quizzes/quiz_questions/quiz_options quand elles répondent
 *            (fetchSiteQuizzes + questions/options), sinon repli config module
 *            (2 questions du labo). En jsdom/test, aucune ligne → fallback.
 * - sponsor: pub 5s réelle depuis ad_videos (getActiveAds) ; sans pub DB,
 *            anneau 5s du labo.
 * - ref    : code partagé local (backend parrainage = chantier futur).
 * - havecode: validation de FORMAT uniquement, côté client (pas de table
 *            referrals en prod) — le vrai backend parrainage viendra plus tard.
 */
import React, { useEffect, useRef, useState } from "react";
import "./echange.css";
import { getActiveAds, type PortalAdRow } from "@/lib/supabase/portalQueries";
import {
  fetchSiteQuizzes,
  fetchQuizQuestions,
  fetchQuizOptions,
  type PortalQuizOptionRow,
} from "@/lib/supabase/portalModuleQueries";
import type { MissionKind } from "./MissionsBoard";
import { MISSION_LABEL } from "./MissionsBoard";

/** Site par défaut du portail (identique à AuthBox). */
export const DEMO_SITE_ID = "demo-site";

/* ------------------------------------------------------------------ */
/* Quiz                                                                */
/* ------------------------------------------------------------------ */

export interface QuizOption {
  text: string;
  correct: boolean;
}
export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

/** Repli (config module) : les 2 questions du labo. */
export const FALLBACK_QUIZ: QuizQuestion[] = [
  {
    question: "Pourquoi tu te connectes au WiFi ?",
    options: [
      { text: "Contacter ma famille", correct: true },
      { text: "Travailler", correct: false },
      { text: "Me divertir", correct: false },
    ],
  },
  {
    question: "Quel partenaire finance ton WiFi ?",
    options: [
      { text: "WariTel", correct: true },
      { text: "SunuTel", correct: false },
      { text: "Teranga Mobile", correct: false },
    ],
  },
];

async function loadQuizQuestions(siteId: string): Promise<QuizQuestion[]> {
  try {
    const quizzes = await fetchSiteQuizzes(siteId);
    const quiz = quizzes[0];
    if (!quiz) return FALLBACK_QUIZ;
    const questions = await fetchQuizQuestions(quiz.id);
    const built: QuizQuestion[] = [];
    for (const q of questions.slice(0, 2)) {
      const opts: PortalQuizOptionRow[] = await fetchQuizOptions(q.id);
      built.push({
        question: q.question,
        options: opts.map((o) => ({ text: o.option_text, correct: !!o.is_correct })),
      });
    }
    // Un quiz exploitable = questions avec au moins une option correcte.
    const usable = built.filter(
      (q) => q.options.length > 0 && q.options.some((o) => o.correct),
    );
    return usable.length > 0 ? usable : FALLBACK_QUIZ;
  } catch {
    // Table absente / RLS / offline : repli config module.
    return FALLBACK_QUIZ;
  }
}

const QuizRunner: React.FC<{ questions: QuizQuestion[]; onDone: () => void }> = ({
  questions,
  onDone,
}) => {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = questions[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (!item.options[i].correct) {
      // Mauvaise réponse : on montre la bonne puis on repart (comme le labo).
      setTimeout(() => setPicked(null), 1500);
      return;
    }
    if (idx < questions.length - 1) {
      setTimeout(() => {
        setIdx(idx + 1);
        setPicked(null);
      }, 750);
    } else {
      setTimeout(onDone, 650);
    }
  };

  return (
    <div>
      <p className="ec2-prog">
        Question {idx + 1} / {questions.length}
      </p>
      <p className="ec2-q">{item.question}</p>
      <div className="ec2-opts">
        {item.options.map((o, i) => {
          let cls = "ec2-opt";
          if (picked !== null) {
            if (i === picked) cls += o.correct ? " ok" : " no";
            else if (o.correct) cls += " ok";
          }
          return (
            <button
              key={i}
              type="button"
              className={cls}
              data-testid="quiz-option"
              disabled={picked !== null}
              onClick={() => choose(i)}
            >
              <span className="key">{"ABC"[i] ?? "?"}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sponsor                                                             */
/* ------------------------------------------------------------------ */

const SponsorRunner: React.FC<{ ad: PortalAdRow | null; onDone: () => void }> = ({
  ad,
  onDone,
}) => {
  const [left, setLeft] = useState(5);
  const videoRef = useRef<HTMLVideoElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (ad?.video_url) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    }
    const iv = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(iv);
          if (!firedRef.current) {
            firedRef.current = true;
            setTimeout(onDone, 400);
          }
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div>
      {ad?.video_url ? (
        <video
          ref={videoRef}
          className="ec2-ad-video"
          src={ad.video_url}
          muted
          playsInline
          data-testid="sponsor-video"
        />
      ) : (
        <div className="ec2-ring-wrap">
          <div
            className="ec2-ring"
            style={{ ["--angle" as string]: `${(5 - left) * 72}deg` }}
            data-testid="sponsor-ring"
          >
            <span className="n">
              <span className="num mono">{left}</span>
              <small>SECONDES</small>
            </span>
          </div>
        </div>
      )}
      <p className="ec2-ring-hint">
        Notre partenaire <b>{ad?.title ?? "WariTel"}</b> finance ton WiFi. C'est
        tout — aucun formulaire ensuite.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Ref (inviter)                                                       */
/* ------------------------------------------------------------------ */

export function makeReferralCode(): string {
  return "PC-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

const RefRunner: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [code] = useState(makeReferralCode);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(onDone, 600);
  };

  const waHref =
    "https://wa.me/?text=" +
    encodeURIComponent(
      `Mon code WiFi PremiumConnect : ${code} — entre-le sur le portail, 5 min offertes !`,
    );

  return (
    <div>
      <div className="ec2-ref-code" data-testid="ref-code">
        <span className="c mono">{code}</span>
        <button type="button" className={`ec2-copy${copied ? " done" : ""}`} onClick={copy}>
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <div className="ec2-ref-share">
        <a className="ec2-wa" href={waHref} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </div>
      <p className="ec2-hint">
        Ton proche entre ce code dans <b>« J'ai un code parrainage »</b> : il
        gagne 5 min, tu gagnes 15 min.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* HaveCode — validation de FORMAT uniquement (backend parrainage = futur) */
/* ------------------------------------------------------------------ */

/** Format accepté : 4 à 8 caractères alphanumériques (majuscules/chiffres). */
export function isValidReferralFormat(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code);
}

const HaveCodeRunner: React.FC<{ onDone: (code: string) => void }> = ({ onDone }) => {
  const [buf, setBuf] = useState("");
  const [err, setErr] = useState(false);

  const press = (k: string) => {
    if (k === "del") return setBuf((b) => b.slice(0, -1));
    if (k === "ok") {
      if (!isValidReferralFormat(buf)) {
        setErr(true);
        return;
      }
      onDone(buf);
      return;
    }
    setBuf((b) => (b.length < 8 ? b + k : b));
    setErr(false);
  };

  const msg = buf
    ? buf.length < 4
      ? `Encore ${4 - buf.length} caractère(s)`
      : "Prêt — valide le code"
    : "Saisis le code que ton proche t'a envoyé.";

  return (
    <div>
      <div className={`ec2-codefield mono${err ? " err" : ""}`} data-testid="code-field">
        {buf}
      </div>
      <p className={`ec2-code-msg${err ? " bad" : ""}`}>
        {err ? "Le code est trop court (4 caractères minimum)." : msg}
      </p>
      <div className="ec2-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((k) => (
          <button
            key={k}
            type="button"
            className={`ec2-key2${k === "⌫" ? " fn" : ""}${k === "OK" ? " go" : ""}`}
            data-key={k}
            onClick={() => press(k === "⌫" ? "del" : k === "OK" ? "ok" : k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* MissionRunner                                                       */
/* ------------------------------------------------------------------ */

interface MissionRunnerProps {
  kind: MissionKind;
  siteId?: string;
  onComplete: (kind: MissionKind) => void;
  onCancel: () => void;
}

const MissionRunner: React.FC<MissionRunnerProps> = ({
  kind,
  siteId = DEMO_SITE_ID,
  onComplete,
  onCancel,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [ad, setAd] = useState<PortalAdRow | null>(null);

  // Sources réelles (best-effort) : quiz DB + pub DB. Échec → fallback labo.
  useEffect(() => {
    let alive = true;
    if (kind === "quiz") {
      loadQuizQuestions(siteId).then((qs) => {
        if (alive) setQuestions(qs);
      });
    }
    if (kind === "sponsor") {
      getActiveAds(siteId)
        .then((ads) => {
          if (alive) setAd(ads[0] ?? null);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [kind, siteId]);

  const done = (arg?: unknown) => onComplete(kind);

  return (
    <div className="ec2-task" data-testid="mission-runner">
      <div className="hd">
        <span className="k">{MISSION_LABEL[kind]}</span>
        <button type="button" className="x" data-testid="mission-cancel" onClick={onCancel}>
          Annuler ✕
        </button>
      </div>
      <div className="ec2-card">
        {kind === "quiz" &&
          (questions ? <QuizRunner questions={questions} onDone={done} /> : <p>Chargement…</p>)}
        {kind === "sponsor" && <SponsorRunner ad={ad} onDone={done} />}
        {kind === "ref" && <RefRunner onDone={done} />}
        {kind === "havecode" && <HaveCodeRunner onDone={done} />}
      </div>
    </div>
  );
};

export default MissionRunner;
