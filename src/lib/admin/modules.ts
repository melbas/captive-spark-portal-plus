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

const ICONS: Record<string, string> = {
  auth_sms: 'message-square',
  auth_email: 'mail',
  auth_social: 'share-2',
  mini_games: 'gamepad-2',
  loyalty_program: 'gift',
  video_system: 'monitor-play',
  mobile_money: 'wallet',
  ecommerce_light: 'shopping-cart',
  learning_center: 'graduation-cap',
  social_integration: 'share-2',
  targeted_marketing: 'megaphone',
  ai_chat_multilingual: 'sparkles',
};

/** Nom de lucide-icon (string) par module ; fallback générique 'puzzle'. */
export function moduleIcon(moduleName: string): string {
  return ICONS[moduleName] ?? 'puzzle';
}
