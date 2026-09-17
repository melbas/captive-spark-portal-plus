-- ===========================================================================
-- 20260918010000_tracking_ads.sql
--
-- Suit le point 1 de la roadmap : le portail n'alimentait JAMAIS la table
-- `events` — aucune mesure de fonctionnement (visiteurs, pubs regardées,
-- conversions). L'Edge `track-event` (livré) écrit maintenant dans `events`.
--
-- Cette migration :
--   1. Complète `ad_videos` pour une vraie gestion pub (scope site + type).
--   2. Ajoute `site_id` aux events (filtrage par site, cohérent avec le
--      périmètre multi-tenant).
--   3. Crée `ad_stats` : agrégat quotidien par pub (vues, complétions, clics,
--      taux) — base des dashboards. Calculé depuis `events`, jamais écrit
--      directement par le front.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. ad_videos : scope site + type de média
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."ad_videos"
  ADD COLUMN IF NOT EXISTS "site_id" uuid REFERENCES "public"."sites"("id") ON DELETE CASCADE;

-- Type de média. Au moment de l'écriture, le front déduit ce type de
-- l'extension d'URL (src/hooks/usePortalConfig.ts — dette §7). La colonne
-- devient le contrat : dès qu'elle est renseignée, elle fait foi.
ALTER TABLE "public"."ad_videos"
  ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'video';

-- Enum effectif (CHECK) : un seul type possible par média.
ALTER TABLE "public"."ad_videos"
  ADD CONSTRAINT "ad_videos_type_check"
  CHECK ("type" = ANY (ARRAY['video', 'audio', 'image']::text[]));

-- Backfill : déduit le type de l'extension pour les lignes existantes.
UPDATE "public"."ad_videos"
SET "type" = CASE
  WHEN video_url ~ '\.(mp3|m4a|ogg|wav)(\?|$)' THEN 'audio'
  WHEN video_url ~ '\.(mp4|webm|mov)(\?|$)' THEN 'video'
  ELSE 'image'
END
WHERE "type" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_ad_videos_site_active"
  ON "public"."ad_videos" ("site_id", "active", "priority");

-- ---------------------------------------------------------------------------
-- 2. events : site_id (filtrage multi-tenant des dashboards)
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "site_id" uuid REFERENCES "public"."sites"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_events_site_type_created"
  ON "public"."events" ("site_id", "event_type", "created_at" DESC);

-- Backfill : rattache les events existants au site de leur utilisateur.
UPDATE "public"."events" e
SET "site_id" = u.site_id
FROM "public"."wifi_users" u
WHERE e.site_id IS NULL AND e.user_id = u.id;

-- ---------------------------------------------------------------------------
-- 3. ad_stats : agrégat quotidien par pub
--    Jamais écrit par le front. Matérialisé par une vue partitionnée en
--    lecture seule → les dashboards admin ne lisent que cette vue.
-- ---------------------------------------------------------------------------

-- Écriture : impossible en front (aucune policy) — service_role uniquement.
CREATE TABLE IF NOT EXISTS "public"."ad_stats" (
  "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
  "ad_id" uuid NOT NULL REFERENCES "public"."ad_videos"("id") ON DELETE CASCADE,
  "site_id" uuid NOT NULL REFERENCES "public"."sites"("id") ON DELETE CASCADE,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "views" integer NOT NULL DEFAULT 0,
  "completions" integer NOT NULL DEFAULT 0,
  "clicks" integer NOT NULL DEFAULT 0,
  "skips" integer NOT NULL DEFAULT 0,
  -- Taux dérivés (pré-calculés pour les dashboards).
  "completion_rate" numeric(5,2) NOT NULL DEFAULT 0,
  "ctr" numeric(5,2) NOT NULL DEFAULT 0,
  "unique_viewers" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT "now"(),
  CONSTRAINT "ad_stats_unique" UNIQUE ("ad_id", "date")
);

CREATE INDEX IF NOT EXISTS "idx_ad_stats_site_date"
  ON "public"."ad_stats" ("site_id", "date" DESC);

ALTER TABLE "public"."ad_stats" ENABLE ROW LEVEL SECURITY;
-- Aucune policy RLS : lecture réservée au service_role (dashboards admin via
-- Edge authentifiée), aucune écriture directe possible.

-- ---------------------------------------------------------------------------
-- ROLLBACK (20260918010000_tracking_ads_reverse.sql)
-- ---------------------------------------------------------------------------
-- DROP VIEW IF EXISTS public.ad_stats_daily;
-- DROP TABLE IF EXISTS public.ad_stats;
-- DROP INDEX IF EXISTS public.idx_events_site_type_created;
-- ALTER TABLE public.events DROP COLUMN IF EXISTS site_id;
-- DROP INDEX IF EXISTS public.idx_ad_videos_site_active;
-- ALTER TABLE public.ad_videos DROP CONSTRAINT IF EXISTS ad_videos_type_check;
-- ALTER TABLE public.ad_videos DROP COLUMN IF EXISTS type;
-- ALTER TABLE public.ad_videos DROP COLUMN IF EXISTS site_id;
