-- ============================================================================
-- MULTI-TENANT RBAC (PLAN-FINAL §5) — rôles, scoping site→reseller
-- ----------------------------------------------------------------------------
-- Migration LOCALE pour revue — NON appliquée au live.
-- Modèle :
--   super_admin   (opérateur plateforme) → voit tout
--   reseller      → voit les sites où sites.reseller_id = son reseller_id
--   site_manager  → voit uniquement ses site_id
--   viewer        → lecture seule sur son périmètre (comme reseller/SM)
-- Contrat org/memberships : les clients directs SANS revendeur sont supportés
-- (reseller_id NULL + site_id sur le rôle) — pas d'implémentation de
-- tarification/commission dans ce lot (non validé produit).
-- ----------------------------------------------------------------------------

-- 1. Rôles : étendre app_role (ALTER TYPE ... ADD VALUE n'est PAS réversible
--    en transaction : les 4 valeurs sont ajoutées de manière idempotente,
--    rollback documenté = recréation de l'enum, non appliquée automatiquement).
alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'reseller';
alter type public.app_role add value if not exists 'site_manager';
alter type public.app_role add value if not exists 'viewer';

-- 2. user_roles : périmètre par tenant
alter table public.user_roles
  add column if not exists reseller_id uuid references public.resellers(id) on delete set null,
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

create index if not exists user_roles_reseller_id_idx on public.user_roles(reseller_id);
create index if not exists user_roles_site_id_idx on public.user_roles(site_id);

-- 3. pc_admin_users : aligner le CHECK sur les 4 rôles SaaS
--    (contrainte live actuelle : super_admin/reseller_admin/reseller_viewer)
--    Migration additive : on remplace la contrainte. REVERSIBLE : l'ancienne
--    contrainte est recréable (voir ROLLBACK).
alter table public.pc_admin_users drop constraint if exists pc_admin_users_role_check;
alter table public.pc_admin_users
  add constraint pc_admin_users_role_check
  check (role in ('super_admin','reseller','site_manager','viewer'));

-- 4. RLS sur pc_admin_users (actuellement sans RLS ? on force l'activation)
alter table public.pc_admin_users enable row level force;

drop policy if exists "pc_admin_users_super_admin_manage" on public.pc_admin_users;
create policy "pc_admin_users_super_admin_manage"
  on public.pc_admin_users for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "pc_admin_users_reseller_read_own" on public.pc_admin_users;
create policy "pc_admin_users_reseller_read_own"
  on public.pc_admin_users for select to authenticated
  using (reseller_id is not null and public.is_reseller_of(reseller_id));

-- 5. user_roles : policies scoping (remplace les doublons existants)
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='user_roles'
  loop
    execute format('drop policy if exists %I on public.user_roles', r.policyname);
  end loop;
end $$;

create policy "user_roles_self_read"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "user_roles_admin_manage"
  on public.user_roles for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "user_roles_reseller_manage_own"
  on public.user_roles for all to authenticated
  using (public.is_super_admin() or reseller_id is null or public.is_reseller_of(reseller_id))
  with check (public.is_super_admin() or public.is_reseller_of(reseller_id));

-- 6. Fonctions de scoping — SECURITY DEFINER, search_path fixé (bonne pratique)
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('super_admin','admin')
  );
$$;

create or replace function public.is_reseller_of(p_reseller_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and reseller_id = p_reseller_id
      and role in ('super_admin','admin','reseller')
  );
$$;

create or replace function public.can_access_site(p_site_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.sites s on s.id = p_site_id
    where ur.user_id = auth.uid()
      and (
        ur.role in ('super_admin','admin')                       -- opérateur : tout
        or (ur.role = 'reseller'    and ur.reseller_id = s.reseller_id)
        or (ur.role in ('site_manager','viewer') and ur.site_id = s.id)
      )
  );
$$;

-- 7. is_admin_user() : compatible avec l'existant (rôle 'admin'), étendu au
--    périmètre multi-tenant. Utilisée par les policies d'écriture back office.
create or replace function public.is_admin_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_super_admin()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('reseller','site_manager')
  );
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_reseller_of(uuid) to authenticated;
grant execute on function public.can_access_site(uuid) to authenticated;
grant execute on function public.is_admin_user() to authenticated;
revoke execute on function public.can_access_site(uuid) from anon;

-- 8. Policies métier scopées site → reseller (exemples fondateurs)
--    Tables : wifi_users, wifi_sessions, transactions
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename in ('wifi_users','wifi_sessions')
      and roles @> '{authenticated}'
      and policyname not in ('wifi_users_own_profile_only','wifi_users_own_profile_update',
                             'wifi_sessions_user_update_own','wifi_sessions_user_create_own')
  loop
    execute format('drop policy if exists %I on public.%I',
      r.policyname,
      case when r.policyname like '%users%' then 'wifi_users' else 'wifi_sessions' end);
  end loop;
end $$;
-- ⚠️ Le do-block ci-dessus supprime les ~8 policies authenticated dupliquées
-- sur wifi_users/wifi_sessions SAUF les policies "self". Reversibilité :
-- elles sont toutes listées dans le dump supabase/migrations_schema_dump.sql.

create policy "wifi_users_site_scope_select"
  on public.wifi_users for select to authenticated
  using (auth.uid() = id or public.can_access_site(site_id));

create policy "wifi_users_site_scope_write"
  on public.wifi_users for all to authenticated
  using (public.can_access_site(site_id) and not public.is_viewer())
  with check (public.can_access_site(site_id) and not public.is_viewer());

create policy "wifi_sessions_site_scope_select"
  on public.wifi_sessions for select to authenticated
  using (auth.uid() = user_id or public.can_access_site(site_id));

create policy "wifi_sessions_site_scope_write"
  on public.wifi_sessions for all to authenticated
  using (public.can_access_site(site_id) and not public.is_viewer())
  with check (public.can_access_site(site_id) and not public.is_viewer());

create policy "transactions_site_scope_select"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id or public.can_access_site(site_id));

create policy "transactions_site_scope_write"
  on public.transactions for all to authenticated
  using (public.can_access_site(site_id) and not public.is_viewer())
  with check (public.can_access_site(site_id) and not public.is_viewer());

-- viewer = lecture seule (helper réutilisable)
create or replace function public.is_viewer()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'viewer'
  );
$$;
grant execute on function public.is_viewer() to authenticated;

-- ---------------------------------------------------------------------------
-- ROLLBACK (exécuter manuellement) :
--   drop policy ... (les 9 policies créées ci-dessus) ;
--   recréer les policies supprimées depuis migrations_schema_dump.sql ;
--   recréer pc_admin_users_role_check:
--     alter table public.pc_admin_users drop constraint pc_admin_users_role_check;
--     alter table public.pc_admin_users add constraint pc_admin_users_role_check
--       check (role in ('super_admin','reseller_admin','reseller_viewer'));
--   alter table public.user_roles drop column site_id, drop column reseller_id;
--   (les valeurs ajoutées à app_role restent ; elles sont sans effet si
--    non utilisées — PostgreSQL ne permet pas de DROP VALUE.)
-- ============================================================================
