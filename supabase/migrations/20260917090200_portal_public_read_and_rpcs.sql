-- ============================================================================
-- PORTAL PUBLIC READ + ATOMIC RPCs + FIDELITY UNIFICATION
-- ----------------------------------------------------------------------------
-- Migration LOCALE pour revue — NON appliquée au live.
-- Corrections de consigne intégrées :
--   - increment_statistic / increment_loyalty_pts : PAS de grant anon.
--     Exécutable uniquement par service_role (Edge Functions) et les admins
--     authentifiés. Aucun incrément arbitraire appelable depuis le portail.
--   - loyalty_points n'est PAS supprimée (colonne live) : synchronisée par
--     trigger vers loyalty_pts ; la suppression réelle est documentée pour
--     une migration ultérieure validée.
-- ----------------------------------------------------------------------------

-- 1. Catalogue / thèmes / contenus : SELECT anon lignes actives
--    ad_videos/games/quizzes/rewards ont déjà "Allow public read" (active=true)
--    → inchangés. portal_modules/portal_themes/portal_config/… traités ci-dessous.

-- 2. Écriture back office : une seule policy ALL par table de personnalisation
--    (les doublons existants sont listés dans le dump, à nettoyer en revue).
drop policy if exists "Allow public read" on public.portal_modules;
drop policy if exists "Allow public read" on public.portal_themes;
create policy "public_read_portal_modules"
  on public.portal_modules for select to anon, authenticated using (true);
create policy "public_read_portal_themes"
  on public.portal_themes for select to anon, authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['portal_config','portal_modules','portal_themes',
                           'portal_enabled_modules','portal_customizations',
                           'ad_videos','games','quizzes','rewards']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (public.is_admin_user() and not public.is_viewer())
      with check (public.is_admin_user() and not public.is_viewer())
    $f$, t || '_admin_all', t);
  end loop;
end $$;

-- 3. Trigger portal_version++ à chaque modification de portal_config
create or replace function public.bump_portal_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.portal_version := coalesce(old.portal_version, 0) + 1;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists portal_config_bump_version on public.portal_config;
create trigger portal_config_bump_version
  before update on public.portal_config
  for each row execute function public.bump_portal_version();

-- 4. increment_statistic — atomique, SECURITY DEFINER, PAS de grant anon
--    Schéma réel portal_statistics : id, date, total_connections, video_views,
--    quiz_completions, games_played, leads_collected, ... (pas de config_id)
create or replace function public.increment_statistic(
  p_field text, p_amount integer default 1
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  allowed text[] := array['total_connections','video_views',
                          'quiz_completions','games_played','leads_collected'];
begin
  if not (p_field = any(allowed)) then
    raise exception 'Champ de statistique non autorisé: %', p_field;
  end if;

  -- SQL dynamique avec whitelist stricte (p_field validé ci-dessus).
  -- Upsert par date : pas de UNIQUE sur "date" → on vérifie l'existence.
  if exists (select 1 from public.portal_statistics where "date" = current_date) then
    execute format(
      'update public.portal_statistics set %I = %I + $1 where "date" = current_date',
      p_field, p_field
    ) using p_amount;
  else
    execute format(
      'insert into public.portal_statistics ("date", %I) values (current_date, $1)',
      p_field
    ) using p_amount;
  end if;
end $$;
-- NOTE DE REVUE : plpgsql exige du SQL dynamique pour une colonne paramétrée ;
-- p_field est strictement whitelisté par `allowed` (aucune injection possible).


revoke execute on function public.increment_statistic(text, integer) from public, anon, authenticated;
-- Appelable uniquement par service_role (Edge) :
grant execute on function public.increment_statistic(text, integer) to service_role;

-- 5. increment_loyalty_pts — atomique sur loyalty_pts uniquement
create or replace function public.increment_loyalty_pts(
  p_user_id uuid, p_pts integer
)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare v_new integer;
begin
  update public.wifi_users
    set loyalty_pts = greatest(coalesce(loyalty_pts, 0) + p_pts, 0)
    where id = p_user_id
    returning loyalty_pts into v_new;
  if v_new is null then
    raise exception 'Utilisateur inconnu: %', p_user_id;
  end if;
  return v_new;
end $$;

-- Remplace l'ancienne RPC si elle existe (fallback écrasant côté Edge supprimé)
drop function if exists public.increment_loyalty_points(uuid, integer);

revoke execute on function public.increment_loyalty_pts(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_loyalty_pts(uuid, integer) to service_role;

-- 6. Unification loyalty_points → loyalty_pts (SANS drop de colonne live)
--    a) backfill one-shot des lignes où loyalty_pts est null (dans la migration,
--       à valider en revue avant application) :
update public.wifi_users
  set loyalty_pts = coalesce(loyalty_pts, loyalty_points, 0)
  where loyalty_pts is null and loyalty_points is not null;

--    b) trigger de synchronisation pendant la période de transition :
create or replace function public.sync_loyalty_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.loyalty_points is distinct from old.loyalty_points then
    new.loyalty_pts := coalesce(new.loyalty_pts, 0) + (coalesce(new.loyalty_points,0) - coalesce(old.loyalty_points,0));
  end if;
  return new;
end $$;

drop trigger if exists wifi_users_sync_loyalty on public.wifi_users;
create trigger wifi_users_sync_loyalty
  before update on public.wifi_users
  for each row execute function public.sync_loyalty_points();

--    c) La suppression de la colonne loyalty_points (après refonte front) est
--       volontairement reportée : migration dédiée à valider.

-- ---------------------------------------------------------------------------
-- ROLLBACK (exécuter manuellement) :
--   drop trigger wifi_users_sync_loyalty on public.wifi_users;
--   drop function public.sync_loyalty_points();
--   drop function public.increment_loyalty_pts(uuid,integer);
--   drop function public.increment_statistic(uuid,text,bigint);
--   drop trigger portal_config_bump_version on public.portal_config;
--   drop function public.bump_portal_version();
--   drop policy *_admin_all / public_read_* créées ci-dessus ;
--   recréer la policy "Allow public read" sur portal_modules/portal_themes.
-- ============================================================================
