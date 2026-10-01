-- Migration 007 : créer portal_customizations et portal_enabled_modules.
-- Présentes dans le dump du schéma prod (migrations_schema_dump.sql) mais
-- jamais créées par une migration versionnée → 006 échouait sur ces tables.
-- Idempotent (IF NOT EXISTS), structure = dump du 2026-09-28.

create table if not exists public.portal_customizations (
    id uuid default gen_random_uuid() not null primary key,
    portal_config_id uuid,
    customization_type text not null,
    customization_data jsonb default '{}'::jsonb not null,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.portal_enabled_modules (
    id uuid default gen_random_uuid() not null primary key,
    portal_config_id uuid,
    module_id uuid,
    module_config jsonb default '{}'::jsonb,
    is_enabled boolean default true,
    created_at timestamptz default now()
);

create index if not exists portal_customizations_config_idx
  on public.portal_customizations (portal_config_id);
create index if not exists portal_enabled_modules_config_idx
  on public.portal_enabled_modules (portal_config_id);
