-- ===========================================================================
-- 2026-09-28-005_restore_quiz_games_rewards.sql
--
-- Task 14 (éditeurs CRUD quiz/jeux/récompenses par site). La migration
-- 2026-09-28-004_archive_unused_tables.sql a déplacé quizzes, quiz_questions,
-- quiz_options, games et rewards dans le schéma `archive` (elles étaient
-- vides et hors périmètre multi-tenant). Ces modules font partie du parcours
-- portail (portal_modules : mini_games, rewards) — ils sont restaurés en
-- `public` et scopés par site.
--
-- Pour rester simple et réversible :
--   1. Les tables reviennent dans public (schéma d'origine, FK inchangées).
--   2. `site_id` uuid → sites.id est ajouté sur les 3 tables racine
--      (quizzes, games, rewards), comme ad_videos.site_id (20260918010000).
--   3. RLS : lecture publique des lignes actives (portail), écriture
--      authentifiée via can_access_site (isolation multi-tenant).
-- ===========================================================================

-- 1. Retour dans public ------------------------------------------------------

alter table if exists archive.quizzes set schema public;
alter table if exists archive.quiz_questions set schema public;
alter table if exists archive.quiz_options set schema public;
alter table if exists archive.games set schema public;
alter table if exists archive.rewards set schema public;

-- 2. Scope par site ----------------------------------------------------------

alter table public.quizzes
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.games
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.rewards
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

create index if not exists idx_quizzes_site_active on public.quizzes (site_id, active);
create index if not exists idx_games_site_active on public.games (site_id, active);
create index if not exists idx_rewards_site_active on public.rewards (site_id, active);

-- 3. RLS ----------------------------------------------------------------------

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.games enable row level security;
alter table public.rewards enable row level security;

-- Lecture publique : lignes actives d'un site (le portail anonyme les rend).
drop policy if exists "public_read_active_quizzes" on public.quizzes;
create policy "public_read_active_quizzes" on public.quizzes
  for select to anon, authenticated
  using (active = true);

drop policy if exists "public_read_active_games" on public.games;
create policy "public_read_active_games" on public.games
  for select to anon, authenticated
  using (active = true);

drop policy if exists "public_read_active_rewards" on public.rewards;
create policy "public_read_active_rewards" on public.rewards
  for select to anon, authenticated
  using (active = true);

-- Questions/options : lisibles si le quiz parent est actif (join via FK).
drop policy if exists "public_read_quiz_questions" on public.quiz_questions;
create policy "public_read_quiz_questions" on public.quiz_questions
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.active = true
    )
  );

drop policy if exists "public_read_quiz_options" on public.quiz_options;
create policy "public_read_quiz_options" on public.quiz_options
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_options.question_id and q.active = true
    )
  );

-- Écriture admin/site_manager : can_access_site (migration 20260917090100).
drop policy if exists "authenticated_manage_quizzes" on public.quizzes;
create policy "authenticated_manage_quizzes" on public.quizzes
  for all to authenticated
  using (public.can_access_site(site_id))
  with check (public.can_access_site(site_id));

drop policy if exists "authenticated_manage_games" on public.games;
create policy "authenticated_manage_games" on public.games
  for all to authenticated
  using (public.can_access_site(site_id))
  with check (public.can_access_site(site_id));

drop policy if exists "authenticated_manage_rewards" on public.rewards;
create policy "authenticated_manage_rewards" on public.rewards
  for all to authenticated
  using (public.can_access_site(site_id))
  with check (public.can_access_site(site_id));

-- Questions/options suivent l'accès au quiz parent.
drop policy if exists "authenticated_manage_quiz_questions" on public.quiz_questions;
create policy "authenticated_manage_quiz_questions" on public.quiz_questions
  for all to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and public.can_access_site(q.site_id)
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and public.can_access_site(q.site_id)
    )
  );

drop policy if exists "authenticated_manage_quiz_options" on public.quiz_options;
create policy "authenticated_manage_quiz_options" on public.quiz_options
  for all to authenticated
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_options.question_id and public.can_access_site(q.site_id)
    )
  )
  with check (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_options.question_id and public.can_access_site(q.site_id)
    )
  );
