import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  type AdminRole, type Membership, type RoleRow,
  resolveMemberships, effectiveRole, canEdit,
} from '@/lib/admin/roles';

export interface AdminAuth {
  user: User | null;
  isAdmin: boolean;
  /** Rôle effectif le plus élevé des memberships, ou null. */
  role: AdminRole | null;
  /** Memberships (rôle + périmètre site/reseller). C'est LA source des périmètres UI. */
  memberships: Membership[];
  canEdit: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchRoles(userId: string): Promise<RoleRow[]> {
  // Les colonnes site_id/reseller_id sont ajoutées côté backend (cf. RAPPORT-ADMIN.md).
  // Si elles n'existent pas encore en base, on retombe sur le rôle seul.
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, site_id, reseller_id')
    .eq('user_id', userId);
  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (fallbackError) return [];
    return (fallback ?? []).map((r: { role: string }) => ({
      role: r.role,
      site_id: null,
      reseller_id: null,
    }));
  }
  return (data ?? []) as unknown as RoleRow[];
}

export function useAdminAuth(): AdminAuth {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (u: User | null) => {
      if (cancelled) return;
      setUser(u);
      if (u) {
        const rows = await fetchRoles(u.id);
        if (cancelled) return;
        setMemberships(resolveMemberships(rows));
      } else {
        setMemberships([]);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session?.user ?? null);
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const role = effectiveRole(memberships);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMemberships([]);
  };

  return {
    user,
    isAdmin: memberships.length > 0,
    role,
    memberships,
    canEdit: canEdit(role),
    loading,
    signIn,
    signOut,
  };
}
