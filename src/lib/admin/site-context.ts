/**
 * Logique de sélection du site courant (consommée par src/context/SiteContext.tsx).
 * La persistance (localStorage) est gérée par le contexte ; ce module reste pur.
 */
import type { Membership } from './roles';

export interface SiteLike {
  id: string;
  name: string;
  is_active: boolean;
  /** Champs d'affichage du portail (page Sites). */
  portal_slug?: string;
  type?: string;
  location?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  welcome_msg?: string | null;
}

function membershipForSite(memberships: Membership[], siteId: string): Membership | undefined {
  return memberships.find((m) => m.siteId === siteId);
}

/**
 * Site initial :
 * - site_manager : verrouillé sur son site (ignore la persistance) ;
 * - autre rôle : site mémorisé s'il existe encore, sinon premier site ;
 * - aucun site : null (état vide à traiter dans l'UI).
 */
export function selectInitialSite(
  sites: SiteLike[] | null | undefined,
  memberships: Membership[],
  storedSiteId: string | null,
): SiteLike | null {
  const list = sites ?? [];
  if (list.length === 0) return null;

  const locked = memberships.find((m) => m.role === 'site_manager' && m.siteId);
  if (locked?.siteId) {
    return list.find((s) => s.id === locked.siteId) ?? list[0];
  }

  if (storedSiteId) {
    const stored = list.find((s) => s.id === storedSiteId);
    if (stored) return stored;
  }
  return list[0];
}

/** Le membership courant autorise-t-il à basculer vers ce site ? */
export function isSiteAllowed(membership: Membership | null, siteId: string): boolean {
  if (!membership) return false;
  if (membership.role === 'site_manager') return membership.siteId === siteId;
  if (membership.role === 'reseller') {
    // Le périmètre reseller est vérifié côté backend (RLS reseller_id) ;
    // l'UI n'interdit pas la bascule, elle ne verra que ses sites (futur filtre backend).
    return true;
  }
  if (membership.role === 'viewer' || membership.role === 'super_admin') return true;
  return membershipForSite([membership], siteId) !== undefined;
}
