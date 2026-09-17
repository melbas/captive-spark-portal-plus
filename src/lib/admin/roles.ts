/**
 * Rôles multi-tenant du back office.
 * Contrat (cf. docs/RAPPORT-ADMIN.md — à créer côté backend) :
 * - user_roles.role : enum étendu à 'super_admin' | 'reseller' | 'site_manager' | 'viewer'
 *   (valeur legacy 'admin' mappée sur super_admin).
 * - user_roles.site_id / user_roles.reseller_id : périmètre du membership (NULL = global).
 * Pas de rôle global « admin » autorisant tous les tenants : même super_admin passe par
 * des memberships, mais sans périmètre (NULL) = toute la plateforme (opérateur).
 * NB : le filtrage UI masque, l'autorisation réelle doit être vérifiée côté backend (RLS).
 */

export type AdminRole = 'super_admin' | 'reseller' | 'site_manager' | 'viewer';

export interface RoleRow {
  role: string;
  site_id: string | null;
  reseller_id: string | null;
}

export interface Membership {
  role: AdminRole;
  siteId: string | null;
  resellerId: string | null;
}

const KNOWN: AdminRole[] = ['super_admin', 'reseller', 'site_manager', 'viewer'];

const HIERARCHY: Record<AdminRole, number> = {
  viewer: 0,
  site_manager: 1,
  reseller: 2,
  super_admin: 3,
};

export function mapLegacyRole(dbRole: string): AdminRole {
  if (dbRole === 'admin') return 'super_admin';
  return (KNOWN as string[]).includes(dbRole) ? (dbRole as AdminRole) : 'viewer';
}

export function resolveMemberships(rows: RoleRow[] | null | undefined): Membership[] {
  return (rows ?? []).map((r) => ({
    role: mapLegacyRole(r.role),
    siteId: r.site_id ?? null,
    resellerId: r.reseller_id ?? null,
  }));
}

export function effectiveRole(memberships: Membership[]): AdminRole | null {
  if (memberships.length === 0) return null;
  return memberships.reduce((best, m) =>
    HIERARCHY[m.role] > HIERARCHY[best.role] ? m : best,
  ).role;
}

/** Pages réservées au niveau plateforme (opérateur). */
const PLATFORM_ONLY = new Set(['/admin/resellers', '/admin/settings']);

export function navItemsForRole<T extends { to: string }>(role: AdminRole, items: T[]): T[] {
  if (role === 'super_admin') return items;
  if (role === 'reseller') return items.filter((i) => i.to !== '/admin/settings');
  return items.filter((i) => !PLATFORM_ONLY.has(i.to));
}

/** Le rôle autorise-t-il des actions d'écriture ? (viewer = lecture seule) */
export function canEdit(role: AdminRole | null): boolean {
  return role !== null && role !== 'viewer';
}

/**
 * Le rôle autorise-t-il l'édition de ce site précis ?
 * site_manager : uniquement son site. reseller : géré côté backend (RLS reseller_id).
 */
export function canEditSite(
  role: AdminRole | null,
  membershipSiteId: string | null,
  siteId: string,
): boolean {
  if (!canEdit(role)) return false;
  if (role === 'site_manager') return membershipSiteId === siteId;
  return true;
}
