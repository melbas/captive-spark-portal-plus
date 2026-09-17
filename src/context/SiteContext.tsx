import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { selectInitialSite, type SiteLike } from '@/lib/admin/site-context';

const STORAGE_KEY = 'admin-current-site-id';

export interface SiteContextValue {
  sites: SiteLike[];
  currentSite: SiteLike | null;
  currentSiteId: string | null;
  setCurrentSiteId: (id: string | null) => void;
  /** site_manager : verrouillé sur son site, le sélecteur est désactivé. */
  locked: boolean;
  loading: boolean;
  /** Memberships + rôle effectif, pour les pages (canEditSite…). */
  memberships: ReturnType<typeof useAdminAuth>['memberships'];
  role: ReturnType<typeof useAdminAuth>['role'];
  canEdit: boolean;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useCurrentSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useCurrentSite doit être utilisé dans <SiteProvider>');
  return ctx;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { memberships, role, canEdit } = useAdminAuth();
  const [storedId, setStoredId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const { data: sites, isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('*');
      if (error) throw error;
      return (data ?? []) as SiteLike[];
    },
    staleTime: 60_000,
  });

  const lockedMembership = useMemo(
    () => memberships.find((m) => m.role === 'site_manager' && m.siteId) ?? null,
    [memberships],
  );
  const locked = !!lockedMembership && role === 'site_manager';

  const currentSite = useMemo(
    () => selectInitialSite(sites, memberships, lockedMembership?.siteId ?? storedId),
    [sites, memberships, lockedMembership, storedId],
  );

  const setCurrentSiteId = (id: string | null) => {
    setStoredId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : la sélection reste en mémoire */
    }
  };

  // site_manager : réaligner la persistance sur son site verrouillé.
  useEffect(() => {
    if (locked && lockedMembership?.siteId) {
      setCurrentSiteId(lockedMembership.siteId);
    }
  }, [locked, lockedMembership?.siteId]);

  const value: SiteContextValue = {
    sites: sites ?? [],
    currentSite,
    currentSiteId: currentSite?.id ?? null,
    setCurrentSiteId,
    locked,
    loading: isLoading,
    memberships,
    role,
    canEdit,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
