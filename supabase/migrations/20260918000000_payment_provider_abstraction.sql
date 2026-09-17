-- ===========================================================================
-- 20260918000000_payment_provider_abstraction.sql
--
-- Couche d'abstraction provider-agnostic pour le paiement (Bictorys principal,
-- Wave / Orange Money directs en fallback). Réversible.
--
-- Décision produit 2026-09-17 : `PAYMENT_PROVIDER=bictorys` par défaut.
--
-- Vérifié contre supabase/migrations_schema_dump.sql : aucune de ces colonnes
-- n'existe sur `public.transactions` (lignes 1071-1088) :
--   id, user_id, plan_id, payment_method_id, amount, status,
--   transaction_reference, created_at, completed_at, site_id, session_id,
--   amount_fcfa, commission_fcfa, method, provider_ref, wave_checkout_id
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. transactions : traçabilité provider + idempotence
-- ---------------------------------------------------------------------------

-- Provider ayant traité la charge : bictorys | wave | orange.
-- Avant cette migration, le provider était implicite à la méthode (method).
alter table public.transactions
  add column if not exists provider text;

-- Identifiant de transaction COTÉ PROVIDER (wave_checkout_id pour Wave,
-- transactionId Bictorys). Unique : l'idempotence du create-charge s'appuie
-- dessus (une même charge provider ne peut être rattachée qu'à une ligne).
alter table public.transactions
  add column if not exists provider_transaction_id text;

-- Référence de charge envoyée au provider (format `pc-<txId>-<nonce>`).
-- Permet de retrouver la transaction interne depuis un webhook entrant.
alter table public.transactions
  add column if not exists provider_payment_reference text;

-- Sélection du provider par site (back office : AdminSites).
-- Valeurs : bictorys | wave | orange ; null = défaut global PAYMENT_PROVIDER.
alter table public.sites
  add column if not exists payment_provider text;

-- Index pour la recherche webhook (provider_transaction_id) et l'unicité.
create index if not exists transactions_provider_transaction_id_idx
  on public.transactions (provider_transaction_id)
  where provider_transaction_id is not null;

create index if not exists transactions_provider_payment_reference_idx
  on public.transactions (provider_payment_reference)
  where provider_payment_reference is not null;

create index if not exists sites_payment_provider_idx
  on public.sites (payment_provider)
  where payment_provider is not null;

-- Idempotence : une référence provider ne peut être rattachée qu'à UNE
-- transaction interne. (UNIQUE NULLS NOT DISTINCT = deux NULLs autorisés.)
create unique index if not exists transactions_provider_transaction_id_uniq
  on public.transactions (provider_transaction_id)
  where provider_transaction_id is not null;

-- Idempotence create-charge : la clé d'idempotence (paymentReference envoyé au
-- provider) est également unique — un rejeu renvoie la transaction existante
-- au lieu de créer une double charge (voir create-charge §4b).
create unique index if not exists transactions_provider_payment_reference_uniq
  on public.transactions (provider_payment_reference)
  where provider_payment_reference is not null;

comment on column public.transactions.provider is
  'Provider ayant traité la charge : bictorys (principal) | wave | orange (fallbacks directs).';
comment on column public.transactions.provider_transaction_id is
  'Identifiant de transaction côté provider (wave_checkout_id pour Wave). Sert l''idempotence.';
comment on column public.transactions.provider_payment_reference is
  'Référence de charge envoyée au provider : pc-<transactionId>-<nonce>. Résolu par les webhooks.';
comment on column public.sites.payment_provider is
  'Provider de paiement du site : bictorys | wave | orange. NULL = défaut global (PAYMENT_PROVIDER).';

-- ---------------------------------------------------------------------------
-- 2. Backfill réversible : provider implicite depuis `method` (historique)
-- ---------------------------------------------------------------------------
-- Les transactions existantes n'ont pas de provider explicite. On déduit des
-- valeurs historiques pour conserver une comptabilité cohérente, sans perte
-- d'information (method est conservé).
update public.transactions
  set provider = 'wave'
  where provider is null
    and method in ('wave', 'wave_money');

update public.transactions
  set provider = 'orange'
  where provider is null
    and method in ('orange_money', 'om');

-- Contrainte de domaine : provider dans le catalogue connu.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_provider_check'
  ) then
    alter table public.transactions
      add constraint transactions_provider_check
      check (provider is null or provider in ('bictorys', 'wave', 'orange'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. processed_webhook_events : Bictorys + colonne payload
-- ---------------------------------------------------------------------------
-- La table existe (migration 20260917090000) avec `provider` (défaut 'wave').
-- On conserve la même table pour l'idempotence (Wave + Bictorys) et on
-- étend le rôle de `provider` : valeurs 'wave' | 'bictorys' (et futures).
alter table public.processed_webhook_events
  add column if not exists payload jsonb;

comment on column public.processed_webhook_events.payload is
  'Payload webhook brut (debug post-mortem uniquement — jamais lu pour décider).';

-- Index pour les recherches par transaction (retrouver les événements d''une tx).
create index if not exists processed_webhook_events_transaction_id_idx
  on public.processed_webhook_events (transaction_id)
  where transaction_id is not null;

-- ===========================================================================
-- ROLLBACK (réversible — à exécuter en cas de retour arrière)
-- ===========================================================================
-- drop index if exists public.processed_webhook_events_transaction_id_idx;
-- drop index if exists public.sites_payment_provider_idx;
-- drop index if exists public.transactions_provider_payment_reference_uniq;
-- drop index if exists public.transactions_provider_payment_reference_idx;
-- drop index if exists public.transactions_provider_transaction_id_uniq;
-- drop index if exists public.transactions_provider_transaction_id_idx;
-- alter table public.transactions drop constraint if exists transactions_provider_check;
-- alter table public.transactions
--   drop column if exists provider_payment_reference,
--   drop column if exists provider_transaction_id,
--   drop column if exists provider;
-- alter table public.sites drop column if exists payment_provider;
-- alter table public.processed_webhook_events drop column if exists payload;
-- ===========================================================================
