/**
 * Logique « Modules du parcours » : fusion catalogue (portal_modules) ×
 * activations par site (portal_enabled_modules, rattachées au portal_config du site).
 */

export interface CatalogueModule {
  id: string;
  module_name: string;
  display_name: string;
  description?: string | null;
  category?: string | null;
  /** Étape du flow portail (miroir 1:1 — cf. migration catalogue_8_preceptes) */
  flow_step?: string | null;
  /** Position par défaut dans le parcours (catalogue) */
  sort_order?: number | null;
}

export interface EnabledRow {
  module_id: string | null;
  is_enabled: boolean | null;
}

export interface ModuleState extends CatalogueModule {
  enabled: boolean;
}

/** Fusionne le catalogue et les activations. Ordre du catalogue conservé ; off par défaut. */
export function mergeModuleStates(
  catalogue: CatalogueModule[] | null | undefined,
  enabledRows: EnabledRow[] | null | undefined,
): ModuleState[] {
  const byModule = new Map<string, boolean>();
  for (const r of enabledRows ?? []) {
    if (r.module_id) byModule.set(r.module_id, r.is_enabled !== false);
  }
  return (catalogue ?? []).map((m) => ({
    ...m,
    enabled: byModule.get(m.id) ?? false,
  }));
}

/**
 * URL d'aperçu du portail. draft=true → ?preview=1 : le lien montre la version
 * en cours d'édition côté admin ; sans le paramètre = version publiée.
 */
export function portalUrl(origin: string, slug: string, draft: boolean): string {
  const base = `${origin.replace(/\/+$/, '')}/portal/${slug}`;
  return draft ? `${base}?preview=1` : base;
}

/**
 * Catalogue des 8 préceptes — miroir 1:1 du flow portail.
 * Chaque clé est un module_name en base (migration catalogue_8_preceptes)
 * ET un flag lu dans usePortalConfig.ts. Aucune clé orpheline.
 *
 * Réglages hors catalogue (gérés par les onglets de la Forge) :
 *  - social_integration → méthode d'auth (sites.auth_method / AuthBox)
 *  - targeted_marketing → segmentation admin (audiences)
 */
const ICONS: Record<string, string> = {
  payment: 'wallet',
  quiz: 'brain',
  video: 'monitor-play',
  extend_time: 'timer',
  mini_games: 'gamepad-2',
  rewards: 'gift',
  referral: 'users',
  learning_center: 'graduation-cap',
};

/** Nom de lucide-icon (string) par module ; fallback générique 'puzzle'. */
export function moduleIcon(moduleName: string): string {
  return ICONS[moduleName] ?? 'puzzle';
}
