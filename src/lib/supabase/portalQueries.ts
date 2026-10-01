/**
 * portalQueries — helpers de requête Supabase du portail client (Task 17).
 *
 * Le portail est pré-auth (anonyme) : ces helpers ne lisent que des données
 * publiées/actives du site courant, identifiées par le slug de la route.
 *
 * Typage : le schéma généré est en retard sur les migrations (site_id sur
 * games/quizzes/rewards, portal_config.flow_order, etc.) — même workaround de
 * cast ciblé que usePortalConfig / AdsCarousel (builder LooseTable + projection
 * explicite) plutôt que régénérer les types.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PortalSite {
  id: string;
  name: string | null;
  portal_slug: string | null;
  logo_url: string | null;
  primary_color: string | null;
  welcome_msg: string | null;
  /** Template de portail choisi (instant | scene | echange) — migration 20260930000000. */
  portal_template?: string | null;
  /** Champ libre `sites.location` — sert de lieu d'événement au template scène. */
  location?: string | null;
}

export interface PortalPlan {
  id: string;
  name: string;
  duration_min: number | null;
  price_fcfa: number | null;
  speed_down_mb: number | null;
  speed_up_mb: number | null;
  data_limit_mb: number | null;
  max_devices: number | null;
  is_popular: boolean | null;
}

export interface PortalConfigRow {
  id: string;
  portal_name: string | null;
  logo_url: string | null;
  theme_color: string | null;
  welcome_message: string | null;
}

export interface PortalCustomizationRow {
  customization_type: string;
  customization_data: Record<string, unknown> | null;
}

export interface PortalEnabledModuleRow {
  module_id: string;
  is_enabled: boolean | null;
}

export interface PortalModuleRow {
  id: string;
  module_name: string | null;
}

export interface PortalAdRow {
  id: string;
  title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
}

export interface PortalGameRow {
  id: string;
  title: string;
  game_type: string;
  description: string | null;
  points_reward: number | null;
  minutes_reward: number | null;
  category: string | null;
}

export interface PortalQuizRow {
  id: string;
  title: string;
  description: string | null;
}

export interface PortalRewardRow {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  value: string;
}

type QueryResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Builder PostgREST minimal : coupe l'inférence du schéma généré (trop profond
 * pour TS, TS2589) dès `supabase.from(...)` — cast documenté et ciblé.
 */
interface LooseTable {
  select: (columns: string) => LooseTable;
  eq: (column: string, value: string | number | boolean) => LooseTable;
  order: (column: string, opts?: { ascending?: boolean }) => LooseTable;
  single: () => PromiseLike<QueryResult<never>>;
  maybeSingle: () => PromiseLike<QueryResult<never>>;
}
function table(name: string): LooseTable {
  // `from` est restreint aux relations du schéma généré ; on l'élargit
  // explicitement au lieu d'un `any`.
  // IMPORTANT : appel lié (supabase.from(...)) et JAMAIS `const f = supabase.from; f(...)`.
  // Détacher la méthode casse `this` (undefined) → `this.rest` explose au runtime
  // (bug « Cannot read properties of undefined (reading 'rest') », `/portal/*` en erreur).
  const from = supabase.from.bind(supabase) as (relation: string) => unknown;
  return from(name) as unknown as LooseTable;
}

/** Site actif par slug du portail (policy lecture anon attendue — voir notes Task 17). */
export async function getSiteBySlug(slug: string): Promise<PortalSite> {
  const { data, error } = (await table('sites')
    .select('id, name, portal_slug, logo_url, primary_color, welcome_msg, portal_template, location')
    .eq('portal_slug', slug)
    .eq('is_active', true)
    .single()) as unknown as QueryResult<PortalSite>;
  if (error || !data) throw new Error('Site introuvable ou inactif');
  return data;
}

/** Forfaits actifs du site, triés par sort_order. */
export async function getWifiPlans(siteId: string): Promise<PortalPlan[]> {
  const { data, error } = (await table('wifi_plans')
    .select(
      'id, name, duration_min, price_fcfa, speed_down_mb, speed_up_mb, data_limit_mb, max_devices, is_popular',
    )
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })) as unknown as QueryResult<PortalPlan[]>;
  if (error) throw new Error('Lecture des forfaits impossible : ' + error.message);
  return data ?? [];
}

/** Config portail publiée (portal_status = active). */
export async function getPortalConfig(siteId: string): Promise<PortalConfigRow | null> {
  const { data } = (await table('portal_config')
    .select('id, portal_name, logo_url, theme_color, welcome_message')
    .eq('site_id', siteId)
    .eq('portal_status', 'active')
    .maybeSingle()) as unknown as QueryResult<PortalConfigRow>;
  return data ?? null;
}

/** Customisations actives de la config publiée. */
export async function getPortalCustomizations(
  portalConfigId: string,
): Promise<PortalCustomizationRow[]> {
  const { data } = (await table('portal_customizations')
    .select('customization_type, customization_data')
    .eq('portal_config_id', portalConfigId)
    .eq('is_active', true)) as unknown as QueryResult<PortalCustomizationRow[]>;
  return data ?? [];
}

/** Gating des modules : join portal_enabled_modules ↔ catalogue portal_modules. */
export async function getEnabledModules(
  portalConfigId: string,
): Promise<Set<string>> {
  const enabledP = table('portal_enabled_modules')
    .select('module_id, is_enabled')
    .eq('portal_config_id', portalConfigId) as unknown as PromiseLike<
    QueryResult<PortalEnabledModuleRow[]>
  >;
  const catalogueP = table('portal_modules')
    .select('id, module_name')
    .eq('is_active', true) as unknown as PromiseLike<QueryResult<PortalModuleRow[]>>;
  const [enabledRes, catalogueRes] = await Promise.all([enabledP, catalogueP]);
  if (enabledRes.error || catalogueRes.error) return new Set();
  const catalogue = new Map(
    (catalogueRes.data ?? []).map((m) => [m.id, m.module_name]),
  );
  return new Set(
    (enabledRes.data ?? [])
      .filter((row) => row.is_enabled === true)
      .map((row) => catalogue.get(row.module_id))
      .filter((name): name is string => typeof name === 'string'),
  );
}

/** Pubs actives du site (slides vidéo/audio/images), par priorité croissante. */
export async function getActiveAds(siteId: string): Promise<PortalAdRow[]> {
  const { data } = (await table('ad_videos')
    .select('id, title, video_url, thumbnail_url')
    .eq('site_id', siteId)
    .eq('active', true)
    .order('priority', { ascending: true })) as unknown as QueryResult<PortalAdRow[]>;
  return data ?? [];
}

/** Jeux actifs du site. */
export async function getActiveGames(siteId: string): Promise<PortalGameRow[]> {
  const { data } = (await table('games')
    .select(
      'id, title, game_type, description, points_reward, minutes_reward, category',
    )
    .eq('site_id', siteId)
    .eq('active', true)) as unknown as QueryResult<PortalGameRow[]>;
  return data ?? [];
}

/** Quizzes actifs du site. */
export async function getActiveQuizzes(siteId: string): Promise<PortalQuizRow[]> {
  const { data } = (await table('quizzes')
    .select('id, title, description')
    .eq('site_id', siteId)
    .eq('active', true)) as unknown as QueryResult<PortalQuizRow[]>;
  return data ?? [];
}

/** Récompenses actives du site. */
export async function getActiveRewards(siteId: string): Promise<PortalRewardRow[]> {
  const { data } = (await table('rewards')
    .select('id, name, description, reward_type, points_cost, value')
    .eq('site_id', siteId)
    .eq('active', true)) as unknown as QueryResult<PortalRewardRow[]>;
  return data ?? [];
}
