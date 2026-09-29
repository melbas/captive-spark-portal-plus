-- ===========================================================================
-- 2026-09-28-006_anon_portal_read.sql
--
-- Policies SELECT pour le rôle `anon` sur les tables cœur du portail captif
-- pré-authentifié. La migration 2026-09-28-003_rls_policies.sql a activé RLS
-- sur sites, wifi_plans, portal_config, portal_customizations et
-- portal_enabled_modules SANS aucune policy pour `anon` : en prod, le portail
-- affiche « Site introuvable ou inactif » pour tout visiteur non connecté.
--
-- Principe fail-safe : n'exposer QUE les lignes publiables.
--   - sites                    : is_active = true
--   - wifi_plans               : is_active = true ET site parent actif
--   - portal_config            : portal_status = 'active' (jamais draft/inactive)
--   - portal_customizations    : is_active = true ET config parente publiée
--   - portal_enabled_modules   : is_enabled = true ET config parente publiée
--
-- Noms distincts (`public_read_anon_*`) : CREATE POLICY échoue si le nom
-- existe déjà ; les policies `authenticated` de 003 ne sont pas touchées.
--
-- ⚠️ NON APPLIQUÉE EN PROD : application locale uniquement (supabase db push
-- distant interdit). Le déploiement prod est une étape manuelle séparée.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 1. SITES : sites actifs uniquement (le portail résout par portal_slug)
-- --------------------------------------------------------------------------
drop policy if exists "public_read_anon_active_sites" on public.sites;
create policy "public_read_anon_active_sites"
  on public.sites for select
  to anon
  using (is_active = true);

-- --------------------------------------------------------------------------
-- 2. WIFI_PLANS : forfaits actifs d'un site actif (fail-safe : un plan
--    rattaché à un site désactivé n'est jamais exposé)
--
-- ⚠️ Des policies permissives antérieures existent (« Allow public read »
--    active=true du schéma d'origine, « public_read_active_plans » de
--    20260227072046) : PostgreSQL combine les policies permissives en OU, donc
--    elles ré-ouvriraient les plans des sites inactifs. Une policy
--    RESTRICTIVE (combinée en ET) referme cette faille pour anon sans
--    écraser les policies existantes.
-- --------------------------------------------------------------------------
drop policy if exists "public_read_anon_active_plans" on public.wifi_plans;
create policy "public_read_anon_active_plans"
  on public.wifi_plans for select
  to anon
  using (
    is_active = true
    and exists (
      select 1 from public.sites s
      where s.id = wifi_plans.site_id
        and s.is_active = true
    )
  );

-- Verrou fail-safe : aucune ligne anon si le site parent n'est pas actif,
-- quelle que soit la policy permissive par ailleurs applicable.
drop policy if exists "restrict_anon_plans_to_active_sites" on public.wifi_plans;
create policy "restrict_anon_plans_to_active_sites"
  on public.wifi_plans
  as restrictive
  for select
  to anon
  using (
    exists (
      select 1 from public.sites s
      where s.id = wifi_plans.site_id
        and s.is_active = true
    )
  );

-- --------------------------------------------------------------------------
-- 3. PORTAL_CONFIG : uniquement la config publiée (portal_status = 'active').
--    Les lignes 'draft' et 'inactive' restent invisibles pour anon.
-- --------------------------------------------------------------------------
drop policy if exists "public_read_anon_active_portal_config" on public.portal_config;
create policy "public_read_anon_active_portal_config"
  on public.portal_config for select
  to anon
  using (portal_status = 'active');

-- --------------------------------------------------------------------------
-- 4. PORTAL_CUSTOMIZATIONS : customisations actives d'une config publiée.
--    « public_read_portal_customizations » (20260917090000, si appliquée)
--    est permissive sans filtre is_active : le verrou RESTRICTIVE ci-dessous
--    garantit le fail-safe (is_active + config publiée) pour anon.
-- --------------------------------------------------------------------------
drop policy if exists "public_read_anon_portal_customizations" on public.portal_customizations;
create policy "public_read_anon_portal_customizations"
  on public.portal_customizations for select
  to anon
  using (
    is_active = true
    and exists (
      select 1 from public.portal_config pc
      where pc.id = portal_customizations.portal_config_id
        and pc.portal_status = 'active'
    )
  );

-- Verrou fail-safe : combine en ET avec toute policy permissive existante.
drop policy if exists "restrict_anon_customizations_published" on public.portal_customizations;
create policy "restrict_anon_customizations_published"
  on public.portal_customizations
  as restrictive
  for select
  to anon
  using (
    is_active = true
    and exists (
      select 1 from public.portal_config pc
      where pc.id = portal_customizations.portal_config_id
        and pc.portal_status = 'active'
    )
  );

-- --------------------------------------------------------------------------
-- 5. PORTAL_ENABLED_MODULES : modules activés d'une config publiée.
-- --------------------------------------------------------------------------
drop policy if exists "public_read_anon_portal_enabled_modules" on public.portal_enabled_modules;
create policy "public_read_anon_portal_enabled_modules"
  on public.portal_enabled_modules for select
  to anon
  using (
    is_enabled = true
    and exists (
      select 1 from public.portal_config pc
      where pc.id = portal_enabled_modules.portal_config_id
        and pc.portal_status = 'active'
    )
  );

-- ===========================================================================
-- Fin migration 006. Les policies authenticated (003, 20260917090100) et les
-- policies anon existantes (005 : quizzes/games/rewards/questions/options,
-- 20260917090000 : portal_config/customizations/enabled_modules si appliquée)
-- sont inchangées ; les noms `public_read_anon_*` sont uniques.
-- ===========================================================================
