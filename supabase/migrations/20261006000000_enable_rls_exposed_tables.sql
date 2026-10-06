-- 20261006000000_enable_rls_exposed_tables.sql
-- Correctif alerte Supabase Advisor (rls_disabled_in_public, 03/10/2026)
-- 3 tables du schéma public étaient sans RLS :

-- otp_attempts : table de rate-limiting OTP. Écrite uniquement par les Edge
-- Functions send-otp / verify-otp en service_role (bypass RLS). Aucune
-- politique = anon bloqué en lecture ET écriture. Table vide en prod.
alter table public.otp_attempts enable row level security;

-- portal_customizations / portal_enabled_modules : des politiques SELECT anon
-- existaient déjà (lecture des portails actifs uniquement) mais restaient
-- inopérantes avec la RLS désactivée — et aucune politique WRITE n'existait,
-- donc l'anon pouvait INSERT/UPDATE/DELETE. Activer la RLS restaure la
-- lecture seule prévue ; aucun changement applicatif nécessaire.
alter table public.portal_customizations enable row level security;
alter table public.portal_enabled_modules enable row level security;
