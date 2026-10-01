/**
 * MissionsBoard — les 4 missions du prototype #v-echange (portal-lab).
 * GAIN identique au labo : quiz +10, sponsor +20, ref +15, havecode +5.
 * La mission→temps est PUREMENT locale : aucun point, aucune table.
 */
import React from "react";
import "./echange.css";

export type MissionKind = "quiz" | "sponsor" | "ref" | "havecode";

export const GAIN: Record<MissionKind, number> = {
  quiz: 10,
  sponsor: 20,
  ref: 15,
  havecode: 5,
};

export const MISSION_LABEL: Record<MissionKind, string> = {
  quiz: "Quiz",
  sponsor: "Sponsor",
  ref: "Parrainage",
  havecode: "Code parrainage",
};

interface MissionDef {
  kind: MissionKind;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const stroke = {
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MISSIONS: MissionDef[] = [
  {
    kind: "quiz",
    title: "2 questions",
    desc: "20 secondes",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    kind: "sponsor",
    title: "Voir le sponsor",
    desc: "5 secondes",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.5-.5z" />
      </svg>
    ),
  },
  {
    kind: "ref",
    title: "Inviter un proche",
    desc: "Partage ton code",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M10 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4" />
        <path d="M13 4h6v6" />
        <path d="M19 4l-8 8" />
      </svg>
    ),
  },
  {
    kind: "havecode",
    title: "J'ai un code parrainage",
    desc: "Entre le code d'un proche",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 7h16v4a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />
        <path d="M9 7v13" strokeDasharray="2 3" />
      </svg>
    ),
  },
];

interface MissionsBoardProps {
  /** Kinds déjà honorés (carte grisée + coche). */
  doneKinds: Set<MissionKind>;
  onPick: (kind: MissionKind) => void;
}

const MissionsBoard: React.FC<MissionsBoardProps> = ({ doneKinds, onPick }) => {
  return (
    <div className="ec2-missions" data-testid="missions-board">
      {MISSIONS.map((m) => {
        const done = doneKinds.has(m.kind);
        return (
          <button
            key={m.kind}
            type="button"
            className={`ec2-mission${done ? " done" : ""}`}
            data-kind={m.kind}
            data-done={done || undefined}
            onClick={() => {
              if (!done) onPick(m.kind);
            }}
          >
            <span className="ic">{m.icon}</span>
            <span>
              <span className="t">{m.title}</span>
              <span className="d">{m.desc}</span>
            </span>
            <span className="check" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span className="gain">+{GAIN[m.kind]} min</span>
          </button>
        );
      })}
    </div>
  );
};

export default MissionsBoard;
