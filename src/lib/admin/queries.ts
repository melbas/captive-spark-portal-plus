/**
 * Scoping multi-tenant des requêtes admin : tout est filtré par le site courant.
 *
 * Pourquoi un module dédié : les pages admin historiques faisaient des requêtes
 * globales (pas de filtre site_id) alors que la donnée du produit est par site.
 * Centraliser la clé et les garde-fous ici les rend visibles et vérifiables en
 * relecture, plutôt qu'éparpillés dans chaque page.
 *
 * Ce module est de la logique pure (clés de cache, périmètres, rôles) : testable
 * sans DOM ni client Supabase.
 */
import type { AdminRole, Membership } from './roles';

/** Tables métier portant une colonne site_id (schéma live, cf. types.ts). */
export const SITE_SCOPED_TABLES = [
  'wifi_sessions',
  'wifi_users',
  'transactions',
  'vouchers',
  'wifi_plans',
] as const;

export type SiteScopedTable = (typeof SITE_SCOPED_TABLES)[number];

/** Clé de cache TanStack par site : changer de site = nouvelle entrée. */
export function siteQueryKey(base: string, siteId: string | null | undefined): (string | null)[] {
  return [base, siteId ?? null];
}

/**
 * Colonne de filtrage par site, ou null si aucune page ne doit tirer de données
 * (aucun site sélectionné). Les appelants utilisent `enabled: !!siteId` — ne
 * JAMAIS faire de requête non scopée, elle remonterait tous les sites.
 */
export function siteFilterColumn(siteId: string | null | undefined): { column: 'site_id'; value: string } | null {
  if (!siteId) return null;
  return { column: 'site_id', value: siteId };
}

/** true si la table est connue pour porter un site_id (évite un filtre mort). */
export function isSiteScoped(table: string): boolean {
  return (SITE_SCOPED_TABLES as readonly string[]).includes(table);
}

/**
 * Le rôle peut-il basculer vers ce site dans le sélecteur ?
 * site_manager : verrouillé sur le sien. reseller : son périmètre est vérifié
 * côté backend (RLS reseller_id) ; l'UI laisse la bascule, elle ne voit que ses
 * sites. viewer/super_admin : lecture autorisée partout.
 */
export function canSwitchToSite(memberships: Membership[], siteId: string): boolean {
  const manager = memberships.find((m) => m.role === 'site_manager' && m.siteId);
  if (manager) return manager.siteId === siteId;
  return true;
}

/**
 * Un rôle lecture-seule (viewer) ne doit voir aucun contrôle d'écriture.
 * À combiner avec canEditSite() de roles.ts côté formulaire.
 */
export function isReadOnlyRole(role: AdminRole | null | undefined): boolean {
  return !role || role === 'viewer';
}
