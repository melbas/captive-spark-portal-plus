/**
 * Valeurs par défaut du portail — scoping après Task 18 :
 *
 *  - Les contenus démo (slides pub, vidéo sample-videos.com, audio soundhelix.com)
 *    ont été SUPPRIMÉS : le portail ne sert plus aucune URL démo en dur, la DB
 *    (ad_videos par site) est l'unique source des pubs, y compris en démo.
 *  - Ce module ne garde que les types et constantes de COMPORTEMENT partagés
 *    (gating des modules, engagement), consommés par usePortalConfig et le hook
 *    useWifiPortal.
 */

export interface LocalizedText {
  en: string;
  fr: string;
}

/** Durée de session minimale (fallback de fonctionnement, config publiée sinon). */
export const DEMO_SESSION_MINUTES = 30;

/** Type d'engagement du parcours. */
export type EngagementKind = "video" | "quiz" | "random";

/**
 * Clés de modules du parcours utilisées pour le gating côté portail.
 * Doivent correspondre à `portal_modules.module_name` (catalogue seedé, 12 modules).
 */
export type PortalModuleKey =
  | "quiz"
  | "video"
  | "extend_time"
  | "mini_games"
  | "rewards"
  | "referral"
  | "learning_center"
  | "payment"
  | "exchange";

/** État de gating : `null` = aucune config publiée (fail-closed sur un vrai site). */
export type PortalModuleGating = Record<PortalModuleKey, boolean> | null;

/** Gating complet (démo sans config). */
export const ALL_MODULES_ENABLED: PortalModuleGating = {
  quiz: true,
  video: true,
  extend_time: true,
  mini_games: true,
  rewards: true,
  referral: true,
  learning_center: true,
  payment: true,
  exchange: true,
};

/**
 /** Fail-closed : sur un vrai site sans config publiée, seuls les modules
  * obligatoires du parcours restent visibles. Rien n'est simulé.
  */
 export const MANDATORY_ONLY_GATING: PortalModuleGating = {
   quiz: true,
   video: true,
   extend_time: true,
   mini_games: false,
   rewards: false,
   referral: false,
   learning_center: false,
   payment: false,
   exchange: false,
 };
