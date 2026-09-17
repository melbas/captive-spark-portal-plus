-- ============================================================================
-- P0 SECURITY HARDENING — restrict large anon policies, webhook infra, OTP RL
-- ----------------------------------------------------------------------------
-- CONTRAT DE LIVRAISON : ce fichier est une migration LOCALE destinée à revue.
-- Elle n'a PAS été appliquée au projet live (pvplhqzzhmqseyzooags).
-- Elle est écrite de façon idempotente ; chaque DROP de policy est réversible
-- via le bloc "ROLLBACK" en fin de fichier (à exécuter manuellement si besoin).
-- ----------------------------------------------------------------------------
-- ⚠️ CHANGEMENTS DE COMPORTEMENT (à valider avec l'agent front) :
--  - anon n'a PLUS aucun accès (SELECT/INSERT/UPDATE) à wifi_users/wifi_sessions.
--    Les écritures du portail passent désormais par les Edge Functions
--    (service_role). src/services/wifi/{user,session}-service.ts doivent être
--    adaptés par l'agent front (voir docs/RAPPORT-BACKEND.md §Front à faire).
--  - anon garde un SELECT sur les tables/vues de CONFIG uniquement (lignes actives).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Webhook Wave : table d'idempotence
-- ---------------------------------------------------------------------------
create table if not exists public.processed_webhook_events (
  event_id     text primary key,          -- id d'événement Wave (ou hash du body)
  provider     text not null default 'wave',
  transaction_id uuid,
  processed_at timestamptz not null default now()
);
alter table public.processed_webhook_events enable row level security;
-- Aucune policy : accessible uniquement via service_role (Edge Functions).

-- ---------------------------------------------------------------------------
-- 2. Rate limiting OTP : compteur par identifiant + IP
-- ---------------------------------------------------------------------------
create table if not exists public.otp_send_rate_limits (
  identifier text not null,               -- phone ou email (lowercased)
  ip_address text not null,
  site_id    uuid,
  hour_bucket timestamptz not null,       -- tronqué à l'heure
  day_bucket  timestamptz not null,       -- tronqué au jour
  sent_count_hour int not null default 1,
  sent_count_day  int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (identifier, ip_address, hour_bucket, day_bucket)
);
alter table public.otp_send_rate_limits enable row level security;
-- Aucune policy : service_role uniquement (écrit/lit via send-otp).

-- ---------------------------------------------------------------------------
-- 3. wifi_users : suppression des policies anon larges
--    (actuellement : INSERT WITH CHECK true + SELECT USING true)
-- ---------------------------------------------------------------------------
drop policy if exists "wifi_users_portal_anon_insert" on public.wifi_users;
drop policy if exists "wifi_users_public_read_by_site" on public.wifi_users;
-- Les autres policies anon résiduelles éventuelles :
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='wifi_users' and roles @> '{anon}'
  loop
    execute format('drop policy if exists %I on public.wifi_users', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. wifi_sessions : suppression des policies anon (INSERT/SELECT/UPDATE true)
-- ---------------------------------------------------------------------------
drop policy if exists "wifi_sessions_portal_anon_insert" on public.wifi_sessions;
drop policy if exists "wifi_sessions_portal_anon_select" on public.wifi_sessions;
drop policy if exists "wifi_sessions_portal_anon_update" on public.wifi_sessions;
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='wifi_sessions' and roles @> '{anon}'
  loop
    execute format('drop policy if exists %I on public.wifi_sessions', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Vue admin wifi_users_public — PII masquée (phone/email hashés)
--    ⚠️ Suite à la correction de consigne : AUCUN accès anon aux users.
--    Cette vue est réservée au back office (authenticated + is_admin_user).
-- ---------------------------------------------------------------------------
create or replace view public.wifi_users_public
with (security_invoker = false) as
select
  u.id,
  u.site_id,
  u.auth_method,
  case when u.phone is not null
       then '***' || right(u.phone, 3) end as phone_masked,
  case when u.email is not null
       then left(split_part(u.email,'@',1),2) || '***@' || split_part(u.email,'@',2) end as email_masked,
  encode(digest(coalesce(u.phone, u.email), 'sha256'), 'hex') as identity_hash,
  u.loyalty_pts,
  u.is_blocked,
  u.created_at
from public.wifi_users u;

grant select on public.wifi_users_public to authenticated;
revoke all on public.wifi_users_public from anon;

-- ---------------------------------------------------------------------------
-- 6. Config : lecture publique des lignes actives (PLAN-FINAL §4/6)
--    portail public = anon SELECT ; écriture = authenticated + is_admin_user()
-- ---------------------------------------------------------------------------
drop policy if exists "No access" on public.portal_config;
drop policy if exists "No access" on public.portal_customizations;
drop policy if exists "No access" on public.portal_enabled_modules;
drop policy if exists "No access" on public.portal_customer_journeys;

create policy "public_read_active_portal_config"
  on public.portal_config for select to anon, authenticated
  using (portal_status = 'active');

create policy "public_read_portal_customizations"
  on public.portal_customizations for select to anon, authenticated
  using (exists (
    select 1 from public.portal_config pc
    where pc.id = portal_customizations.portal_config_id
      and pc.portal_status = 'active'
  ));

create policy "public_read_portal_enabled_modules"
  on public.portal_enabled_modules for select to anon, authenticated
  using (exists (
    select 1 from public.portal_config pc
    where pc.id = portal_enabled_modules.portal_config_id
      and pc.portal_status = 'active'
  ) and is_enabled = true);

create policy "public_read_portal_customer_journeys"
  on public.portal_customer_journeys for select to anon, authenticated
  using (is_active = true);

-- ⚠️ Vérifier les noms de colonnes (portal_status / enabled / is_active) avant
-- application — voir docs/RAPPORT-BACKEND.md §À valider avant application.

-- ---------------------------------------------------------------------------
-- ROLLBACK (exécuter manuellement pour revenir à l'état actuel) :
-- recreate the dropped anon policies:
--   create policy "wifi_users_portal_anon_insert" on public.wifi_users
--     for insert to anon with check (true);
--   create policy "wifi_users_public_read_by_site" on public.wifi_users
--     for select to authenticated, anon using (true);
--   create policy "wifi_sessions_portal_anon_insert" on public.wifi_sessions
--     for insert to anon with check (true);
--   create policy "wifi_sessions_portal_anon_select" on public.wifi_sessions
--     for select to anon using (true);
--   create policy "wifi_sessions_portal_anon_update" on public.wifi_sessions
--     for update to anon using (true) with check (true);
--   (et recréer les policies "No access" USING false sur portal_config etc.)
-- drop table public.processed_webhook_events;
-- drop table public.otp_send_rate_limits;
-- drop view public.wifi_users_public;
-- ============================================================================
