-- Archive unused tables and version schema
-- Move zero-row tables to archive schema as per AUDIT-BACKEND.md

create schema if not exists archive;

-- List of tables to archive (zero-row tables from audit)
alter table if exists public.ad_videos set schema archive;
alter table if exists public.games set schema archive;
alter table if exists public.payment_methods set schema archive;
alter table if exists public.quizzes set schema archive;
alter table if exists public.quiz_questions set schema archive;
alter table if exists public.quiz_options set schema archive;
alter table if exists public.rewards set schema archive;
alter table if exists public.vouchers set schema archive;
alter table if exists public.radius_sessions set schema archive;
alter table if exists public.radius_coa_requests set schema archive;
alter table if exists public.resellers set schema archive;
alter table if exists public.hardware_integrations set schema archive;
alter table if exists public.chat_conversations set schema archive;
alter table if exists public.chat_messages set schema archive;
alter table if exists public.chat_analytics set schema archive;
alter table if exists public.referrals set schema archive;
alter table if exists public.user_segments set schema archive;
alter table if exists public.user_segment_memberships set schema archive;
alter table if exists public.user_access set schema archive;
alter table if exists public.portal_customizations set schema archive;
alter table if exists public.portal_enabled_modules set schema archive;
alter table if exists public.portal_customer_journeys set schema archive;
alter table if exists public.portal_analytics set schema archive;
alter table if exists public.pc_admin_users set schema archive;
alter table if exists public.pc_audit_logs set schema archive;
alter table if exists public.admin_audit_logs set schema archive;
alter table if exists public.admin_sessions set schema archive;
alter table if exists public.security_alerts set schema archive;
alter table if exists public.incidents_tracking set schema archive;
alter table if exists public.qoe_measurements set schema archive;
alter table if exists public.site_availability_metrics set schema archive;
alter table if exists public.auth_funnel_metrics set schema archive;
alter table if exists public.financial_kpis set schema archive;
alter table if exists public.customer_satisfaction_metrics set schema archive;

-- Keep the following tables in public (active, configured, or seed):
-- events, wifi_sessions, wifi_users, portal_statistics (active)
-- portal_modules, ai_providers_config, loyalty_levels, access_profiles, chat_knowledge_base, portal_themes, wifi_plans (seed/reference)
-- audit_config, auth_config, auth_otp_config, portal_config, sites, transactions, user_roles (configured, low traffic)
-- hardware_integrations and resellers are kept because they are used by authorize-guest (though empty)
