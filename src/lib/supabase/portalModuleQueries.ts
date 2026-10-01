/**
 * portalModuleQueries — lectures portail client des modules riches, scopées
 * par site (Task 18).
 *
 * Tables réelles (migration 2026-09-28-005_restore_quiz_games_rewards.sql) :
 * `games`, `rewards`, `quizzes` (+ `quiz_questions`/`quiz_options`) portent un
 * `site_id` et sont lisibles en anon pour les lignes actives.
 *
 * Typage : builder LooseTable + projection explicite (même workaround que
 * usePortalConfig / portalQueries — le schéma généré est en retard sur les
 * migrations).
 */
import { supabase } from "@/integrations/supabase/client";

/* ---------- Types de ligne (projection des colonnes réellement lues) ---------- */

export interface PortalGameRow {
  id: string;
  title: string;
  game_type: string;
  description: string | null;
  points_reward: number | null;
  minutes_reward: number | null;
  category: string | null;
}

export interface PortalRewardRow {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  value: string;
}

export interface PortalQuizRow {
  id: string;
  title: string;
  description: string | null;
}

export interface PortalQuizQuestionRow {
  id: string;
  quiz_id: string;
  question: string;
  order_num: number | null;
}

export interface PortalQuizOptionRow {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean | null;
  order_num: number | null;
}

type QueryResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Builder PostgREST minimal : coupe l'inférence du schéma généré (TS2589) dès
 * `supabase.from(...)` — cast documenté et ciblé, pas de `any` diffus.
 */
interface LooseTable {
  select: (columns: string) => LooseTable;
  eq: (column: string, value: string | number | boolean) => LooseTable;
  order: (column: string, opts?: { ascending?: boolean }) => LooseTable;
  single: () => PromiseLike<QueryResult<never>>;
  maybeSingle: () => PromiseLike<QueryResult<never>>;
}
function table(name: string): LooseTable {
  // bind() obligatoire : détacher la méthode casse `this` → `this.rest` undefined.
  const from = supabase.from.bind(supabase) as (relation: string) => unknown;
  return from(name) as unknown as LooseTable;
}

/** Jeux actifs du site (mini_games). */
export async function fetchSiteGames(siteId: string): Promise<PortalGameRow[]> {
  const { data, error } = (await table("games")
    .select("id, title, game_type, description, points_reward, minutes_reward, category")
    .eq("site_id", siteId)
    .eq("active", true)) as unknown as QueryResult<PortalGameRow[]>;
  if (error) throw new Error("Lecture des jeux impossible : " + error.message);
  return data ?? [];
}

/** Récompenses actives du site (rewards). */
export async function fetchSiteRewards(siteId: string): Promise<PortalRewardRow[]> {
  const { data, error } = (await table("rewards")
    .select("id, name, description, reward_type, points_cost, value")
    .eq("site_id", siteId)
    .eq("active", true)) as unknown as QueryResult<PortalRewardRow[]>;
  if (error) throw new Error("Lecture des récompenses impossible : " + error.message);
  return data ?? [];
}

/** Quizzes actifs du site. */
export async function fetchSiteQuizzes(siteId: string): Promise<PortalQuizRow[]> {
  const { data, error } = (await table("quizzes")
    .select("id, title, description")
    .eq("site_id", siteId)
    .eq("active", true)) as unknown as QueryResult<PortalQuizRow[]>;
  if (error) throw new Error("Lecture des quizzes impossible : " + error.message);
  return data ?? [];
}

/** Questions d'un quiz (triées par order_num). */
export async function fetchQuizQuestions(quizId: string): Promise<PortalQuizQuestionRow[]> {
  const { data, error } = (await table("quiz_questions")
    .select("id, quiz_id, question, order_num")
    .eq("quiz_id", quizId)
    .order("order_num", { ascending: true })) as unknown as QueryResult<PortalQuizQuestionRow[]>;
  if (error) throw new Error("Lecture des questions impossible : " + error.message);
  return data ?? [];
}

/** Options d'une question (triées par order_num). */
export async function fetchQuizOptions(questionId: string): Promise<PortalQuizOptionRow[]> {
  const { data, error } = (await table("quiz_options")
    .select("id, question_id, option_text, is_correct, order_num")
    .eq("question_id", questionId)
    .order("order_num", { ascending: true })) as unknown as QueryResult<PortalQuizOptionRow[]>;
  if (error) throw new Error("Lecture des options impossible : " + error.message);
  return data ?? [];
}
