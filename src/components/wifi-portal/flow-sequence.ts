/**
 * Séquenceur de parcours — remplace le switch codé en dur de useWifiPortal.
 *
 * La Forge publie `portal_config.flow_order` (liste de module_name actifs,
 * dans l'ordre). Le portail l'exécute via `resolveFlowSequence()`.
 *
 * Module PUR : aucun import React, pas de dépendance à l'enum TS de types.ts
 * (les valeurs sont dupliquées ci-dessous pour rester testable en unitaire
 * sans transpilation — cf flow-sequence.test.ts). Si tu ajoutes une étape au
 * portail, mets à jour les DEUX (types.ts et STEP ci-dessous).
 *
 * Cf docs/forge.md — section "Ordre du parcours".
 */

/**
 * Valeurs de l'étape = `Step` dans types.ts.
 * Miroir 1:1 ; tenir les deux synchronisés.
 */
export const STEP = {
  AUTH: "auth",
  ENGAGEMENT: "engagement",
  SUCCESS: "success",
  EXTEND_TIME: "extend-time",
  LEAD_GAME: "lead-game",
  DASHBOARD: "dashboard",
  REWARDS: "rewards",
  REFERRAL: "referral",
  MINI_GAMES: "mini-games",
  ADMIN_STATS: "admin-stats",
  FAMILY_MANAGEMENT: "family-management",
  PAYMENT: "payment",
  LEARNING_CENTER: "learning-center",
} as const;

export type FlowStep = (typeof STEP)[keyof typeof STEP];

/**
 * Mappe un module_name du catalogue vers l'étape du portail qui l'exécute.
 * Miroir 1:1 avec le catalogue (voir docs/catalogue-preceptes.md).
 */
export const MODULE_TO_STEP: Record<string, FlowStep> = {
  quiz: STEP.ENGAGEMENT, // type décidé par engagementType (quiz ou video)
  video: STEP.ENGAGEMENT,
  extend_time: STEP.EXTEND_TIME,
  mini_games: STEP.MINI_GAMES,
  rewards: STEP.REWARDS,
  referral: STEP.REFERRAL,
  learning_center: STEP.LEARNING_CENTER,
  payment: STEP.PAYMENT,
};

/**
 * Ordre par défaut (rétro-compatibilité) : quand aucun parcours n'est publié
 * — la démo, ou un site pas encore forgé — on conserve le parcours historique
 * complet. Pas de régression silencieuse.
 */
export const DEFAULT_FLOW: string[] = [
  "video", "quiz", "extend_time", "mini_games", "rewards",
  "referral", "learning_center", "payment",
];

/**
 * Ordonne les étapes du parcours selon flowOrder (config publiée).
 * - Étapes fixes : AUTH d'abord, SUCCESS à la fin (non négociables).
 * - Préceptes : dans l'ordre publié, doublons dédoublonnés (quiz + video →
 *   une seule étape ENGAGEMENT, type décidé par engagementType).
 * - Noms inconnus ignorés (fail-safe, jamais de throw).
 * - flowOrder vide/absent → DEFAULT_FLOW (parcours historique).
 */
export function resolveFlowSequence(flowOrder?: string[]): FlowStep[] {
  const source = flowOrder && flowOrder.length > 0 ? flowOrder : DEFAULT_FLOW;
  const steps: FlowStep[] = [STEP.AUTH];
  for (const moduleName of source) {
    const step = MODULE_TO_STEP[moduleName];
    if (step && !steps.includes(step)) steps.push(step);
  }
  steps.push(STEP.SUCCESS);
  return steps;
}

/** Prochaine étape après `from` dans le parcours résolu. */
export function nextStepInFlow(
  from: FlowStep,
  flowOrder?: string[],
): FlowStep {
  const seq = resolveFlowSequence(flowOrder);
  const i = seq.indexOf(from);
  if (i < 0 || i >= seq.length - 1) return STEP.SUCCESS;
  return seq[i + 1];
}
