

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    retention_period INTEGER;
BEGIN
    SELECT retention_days INTO retention_period FROM audit_config ORDER BY created_at DESC LIMIT 1;
    DELETE FROM admin_audit_logs WHERE created_at < NOW() - INTERVAL '1 day' * retention_period;
    DELETE FROM admin_sessions WHERE ended_at IS NOT NULL AND ended_at < NOW() - INTERVAL '1 day' * retention_period;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_apply_quota"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_record RECORD;
  session_record RECORD;
BEGIN
  SELECT ua.*, ap.quota_mb, ap.quota_minutes, ap.name as profile_name
  INTO user_record
  FROM user_access ua
  JOIN access_profiles ap ON ua.profile_id = ap.id
  WHERE ua.user_id = target_user_id AND ap.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF (user_record.quota_mb IS NOT NULL AND user_record.quota_used_mb >= user_record.quota_mb) OR
     (user_record.quota_minutes IS NOT NULL AND user_record.minutes_used >= user_record.quota_minutes) THEN
    
    UPDATE radius_sessions SET state = 'expired', stop_time = now(), terminate_cause = 'quota_exceeded'
    WHERE user_id = target_user_id AND state = 'active';
    
    FOR session_record IN 
      SELECT id, nas_ip_address, nas_port_id, session_id
      FROM radius_sessions 
      WHERE user_id = target_user_id AND state = 'expired' AND stop_time >= now() - INTERVAL '1 minute'
    LOOP
      INSERT INTO radius_coa_requests (session_id, request_type, attributes, nas_ip_address, nas_port_id)
      VALUES (session_record.id, 'disconnect', jsonb_build_object('reason', 'quota_exceeded'), session_record.nas_ip_address, session_record.nas_port_id);
    END LOOP;
  END IF;
END;
$$;


ALTER FUNCTION "public"."fn_apply_quota"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_sessions"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "ip_address" "inet", "start_time" timestamp with time zone, "last_seen" timestamp with time zone, "rx_bytes" bigint, "tx_bytes" bigint, "session_time" integer, "max_down_kbps" integer, "max_up_kbps" integer, "quota_mb" integer, "quota_used_mb" numeric, "minutes_used" integer, "quota_usage_percent" numeric, "ssid" "text", "profile_name" "text", "session_id" "text", "username" "text", "mac_address" "text", "ap_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    rs.id,
    rs.user_id,
    rs.ip_address,
    rs.start_time,
    rs.last_seen,
    rs.rx_bytes,
    rs.tx_bytes,
    rs.session_time,
    ap.max_down_kbps,
    ap.max_up_kbps,
    ap.quota_mb,
    ua.quota_used_mb,
    ua.minutes_used,
    CASE 
      WHEN ap.quota_mb > 0 THEN (ua.quota_used_mb * 100.0 / ap.quota_mb)
      ELSE 0
    END as quota_usage_percent,
    rs.ssid,
    ap.name as profile_name,
    rs.session_id,
    rs.username,
    rs.mac_address,
    rs.ap_name
  FROM radius_sessions rs
  LEFT JOIN access_profiles ap ON rs.profile_id = ap.id
  LEFT JOIN user_access ua ON rs.user_id = ua.user_id AND ua.profile_id = ap.id
  WHERE rs.state = 'active'
    AND (
      is_admin_user() OR 
      (auth.uid() = rs.user_id)
    );
$$;


ALTER FUNCTION "public"."get_active_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_realtime_dashboard_metrics"() RETURNS "json"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'global_uptime', COALESCE((
      SELECT AVG(uptime_percentage) 
      FROM site_availability_metrics 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    ), 100),
    'global_qoe_score', COALESCE((
      SELECT AVG(qoe_score) 
      FROM qoe_measurements 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    ), 100),
    'auth_success_rate', COALESCE((
      SELECT AVG(success_rate) 
      FROM auth_funnel_metrics 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    ), 100),
    'active_incidents', (
      SELECT COUNT(*) 
      FROM incidents_tracking 
      WHERE status IN ('open', 'investigating')
    ),
    'critical_sites', (
      SELECT json_agg(
        json_build_object(
          'site_id', site_id,
          'uptime', uptime_percentage,
          'incidents', incident_count
        )
      )
      FROM site_availability_metrics 
      WHERE timestamp > NOW() - INTERVAL '1 hour' 
      AND (uptime_percentage < 99.9 OR incident_count > 0)
    ),
    'last_updated', now()
  )
  WHERE is_admin_user();
$$;


ALTER FUNCTION "public"."get_realtime_dashboard_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_dashboard_metrics"() RETURNS "json"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM wifi_users),
    'active_sessions', (SELECT COUNT(*) FROM radius_sessions WHERE state = 'active'),
    'security_alerts_last_24h', (SELECT COUNT(*) FROM security_alerts WHERE created_at > NOW() - INTERVAL '24 hours'),
    'failed_auth_attempts_today', (SELECT COUNT(*) FROM admin_audit_logs WHERE action_type = 'auth_failure' AND created_at > CURRENT_DATE),
    'total_transactions_today', (SELECT COUNT(*) FROM transactions WHERE created_at > CURRENT_DATE),
    'last_security_scan', NOW()
  )
  WHERE is_admin_user();
$$;


ALTER FUNCTION "public"."get_security_dashboard_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_incident_mttr"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    NEW.mttr_minutes = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.started_at)) / 60;
    NEW.sla_breached = (NEW.mttr_minutes > NEW.sla_target_minutes);
  END IF;
  NEW.last_update_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_incident_mttr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "vlan_id" integer,
    "max_down_kbps" integer DEFAULT 0 NOT NULL,
    "max_up_kbps" integer DEFAULT 0 NOT NULL,
    "quota_mb" integer,
    "quota_minutes" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."access_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "min_view_percentage" integer DEFAULT 80,
    "skip_after_seconds" integer DEFAULT 0,
    "active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ad_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_description" "text" NOT NULL,
    "target_entity" "text",
    "target_id" "uuid",
    "previous_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "uuid",
    "criticality" "text" DEFAULT 'medium'::"text",
    "request_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_audit_logs_criticality_check" CHECK (("criticality" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "location_data" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "session_duration_minutes" integer,
    "total_actions" integer DEFAULT 0,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_providers_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "api_endpoint" "text",
    "api_key_encrypted" "text",
    "model_name" "text",
    "pricing_per_1k_tokens" numeric DEFAULT 0,
    "max_tokens" integer DEFAULT 4000,
    "temperature" numeric DEFAULT 0.7,
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "fallback_provider_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_providers_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "retention_days" integer DEFAULT 730,
    "log_level" "text" DEFAULT 'all'::"text",
    "enable_real_time_alerts" boolean DEFAULT true,
    "enable_email_notifications" boolean DEFAULT true,
    "enable_export_logs" boolean DEFAULT true,
    "max_failed_attempts" integer DEFAULT 5,
    "session_timeout_minutes" integer DEFAULT 480,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_config_log_level_check" CHECK (("log_level" = ANY (ARRAY['minimal'::"text", 'standard'::"text", 'detailed'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."audit_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sms_enabled" boolean DEFAULT true,
    "email_enabled" boolean DEFAULT true,
    "referral_enabled" boolean DEFAULT false,
    "max_attempts" integer DEFAULT 3,
    "timeout_seconds" integer DEFAULT 300,
    "session_duration_minutes" integer DEFAULT 60,
    "auto_disconnect" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auth_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_funnel_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_method" "text" NOT NULL,
    "stage" "text" NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "total_attempts" integer DEFAULT 0 NOT NULL,
    "success_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "site_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auth_funnel_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_otp_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "otp_expiry_seconds" integer DEFAULT 300 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "enable_leaked_password_protection" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auth_otp_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "total_conversations" integer DEFAULT 0,
    "total_messages" integer DEFAULT 0,
    "avg_response_time_ms" numeric DEFAULT 0,
    "total_cost" numeric DEFAULT 0,
    "satisfaction_avg" numeric DEFAULT 0,
    "provider_usage" "jsonb",
    "popular_questions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "conversation_type" "text" DEFAULT 'general'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "user_satisfaction_score" integer,
    "total_messages" integer DEFAULT 0,
    "total_cost" numeric DEFAULT 0,
    "primary_provider_used" "text",
    "context_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text",
    "keywords" "text"[],
    "priority" integer DEFAULT 0,
    "usage_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "context_triggers" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "sender_type" "text" NOT NULL,
    "ai_provider" "text",
    "response_time_ms" integer,
    "tokens_used" integer DEFAULT 0,
    "cost" numeric DEFAULT 0,
    "confidence_score" numeric,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_satisfaction_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "nps_score" integer,
    "csat_score" numeric(3,1),
    "fcr_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "ttfa_median_hours" numeric(6,2),
    "ttfa_p95_hours" numeric(6,2),
    "survey_responses" integer DEFAULT 0 NOT NULL,
    "support_tickets" integer DEFAULT 0 NOT NULL,
    "resolved_first_contact" integer DEFAULT 0 NOT NULL,
    "segment" "text",
    "acquisition_channel" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_satisfaction_metrics_csat_score_check" CHECK ((("csat_score" >= (0)::numeric) AND ("csat_score" <= (5)::numeric))),
    CONSTRAINT "customer_satisfaction_metrics_nps_score_check" CHECK ((("nps_score" >= '-100'::integer) AND ("nps_score" <= 100)))
);


ALTER TABLE "public"."customer_satisfaction_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "event_data" "jsonb",
    "device_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_kpis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "mrr_new" numeric(12,2) DEFAULT 0 NOT NULL,
    "mrr_expansion" numeric(12,2) DEFAULT 0 NOT NULL,
    "mrr_contraction" numeric(12,2) DEFAULT 0 NOT NULL,
    "mrr_churn" numeric(12,2) DEFAULT 0 NOT NULL,
    "mrr_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "nrr_percentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "arpu" numeric(10,2) DEFAULT 0 NOT NULL,
    "arpu_b2b" numeric(10,2) DEFAULT 0 NOT NULL,
    "arpu_b2c" numeric(10,2) DEFAULT 0 NOT NULL,
    "churn_rate_customers" numeric(5,2) DEFAULT 0 NOT NULL,
    "churn_rate_revenue" numeric(5,2) DEFAULT 0 NOT NULL,
    "total_customers" integer DEFAULT 0 NOT NULL,
    "new_customers" integer DEFAULT 0 NOT NULL,
    "churned_customers" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."financial_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "game_type" "text" NOT NULL,
    "config" "jsonb",
    "points_reward" integer DEFAULT 0,
    "minutes_reward" integer DEFAULT 0,
    "active" boolean DEFAULT true,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hardware_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid",
    "brand" "text",
    "controller_url" "text" NOT NULL,
    "api_username" "text",
    "api_password_enc" "text",
    "unifi_site_id" "text" DEFAULT 'default'::"text",
    "is_active" boolean DEFAULT true,
    "last_tested_at" timestamp with time zone,
    "last_test_ok" boolean,
    "last_test_msg" "text",
    CONSTRAINT "hardware_integrations_brand_check" CHECK (("brand" = ANY (ARRAY['ubiquiti'::"text", 'mikrotik'::"text", 'cisco'::"text", 'huawei'::"text", 'tplink'::"text"])))
);


ALTER TABLE "public"."hardware_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "incident_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "severity" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "impact_level" "text" NOT NULL,
    "affected_sites" "text"[],
    "affected_users_count" integer DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "mttr_minutes" integer,
    "sla_target_minutes" integer DEFAULT 240 NOT NULL,
    "sla_breached" boolean DEFAULT false NOT NULL,
    "assigned_to" "uuid",
    "last_update_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eta" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "incidents_tracking_impact_level_check" CHECK (("impact_level" = ANY (ARRAY['service_down'::"text", 'performance_degraded'::"text", 'partial_outage'::"text", 'maintenance'::"text"]))),
    CONSTRAINT "incidents_tracking_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "incidents_tracking_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'investigating'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."incidents_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "min_points" integer NOT NULL,
    "benefits" "jsonb",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."loyalty_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "config" "jsonb",
    "commission_percentage" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pc_admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reseller_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'reseller_viewer'::"text",
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pc_admin_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'reseller_admin'::"text", 'reseller_viewer'::"text"])))
);


ALTER TABLE "public"."pc_admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pc_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pc_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portal_config_id" "uuid",
    "metric_date" "date" DEFAULT CURRENT_DATE,
    "total_visitors" integer DEFAULT 0,
    "successful_authentications" integer DEFAULT 0,
    "conversion_rate" numeric DEFAULT 0,
    "avg_session_duration_minutes" numeric DEFAULT 0,
    "popular_modules" "jsonb" DEFAULT '[]'::"jsonb",
    "revenue_generated" numeric DEFAULT 0,
    "user_satisfaction_score" numeric DEFAULT 0,
    "bounce_rate" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portal_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "logo_url" "text",
    "theme_color" "text" DEFAULT '#3B82F6'::"text",
    "welcome_message" "text",
    "success_message" "text",
    "default_language" "text" DEFAULT 'fr'::"text",
    "available_languages" "jsonb" DEFAULT '["fr", "en"]'::"jsonb",
    "bandwidth_limit_kbps" integer,
    "redirect_url" "text",
    "custom_css" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "site_id" "uuid",
    "wholesaler_id" "uuid",
    "portal_name" "text" DEFAULT 'Portail par défaut'::"text",
    "portal_status" "text" DEFAULT 'active'::"text",
    "portal_version" integer DEFAULT 1,
    "template_id" "uuid",
    CONSTRAINT "portal_config_portal_status_check" CHECK (("portal_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'draft'::"text"])))
);


ALTER TABLE "public"."portal_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_customer_journeys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portal_config_id" "uuid",
    "journey_name" "text" NOT NULL,
    "journey_steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portal_customer_journeys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portal_config_id" "uuid",
    "customization_type" "text" NOT NULL,
    "customization_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portal_customizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_enabled_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portal_config_id" "uuid",
    "module_id" "uuid",
    "module_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portal_enabled_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "module_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "config_schema" "jsonb" DEFAULT '{}'::"jsonb",
    "pricing_tier" "text" DEFAULT 'free'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "portal_modules_module_type_check" CHECK (("module_type" = ANY (ARRAY['mandatory'::"text", 'optional'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."portal_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_statistics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "total_connections" integer DEFAULT 0,
    "video_views" integer DEFAULT 0,
    "quiz_completions" integer DEFAULT 0,
    "games_played" integer DEFAULT 0,
    "leads_collected" integer DEFAULT 0,
    "avg_session_duration" numeric DEFAULT 0,
    "game_completion_rate" numeric DEFAULT 0,
    "conversion_rate" numeric DEFAULT 0,
    "returning_users" integer DEFAULT 0
);


ALTER TABLE "public"."portal_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "theme_type" "text" NOT NULL,
    "color_scheme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "typography" "jsonb" DEFAULT '{}'::"jsonb",
    "layout_config" "jsonb" DEFAULT '{}'::"jsonb",
    "cultural_context" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "portal_themes_theme_type_check" CHECK (("theme_type" = ANY (ARRAY['cultural'::"text", 'seasonal'::"text", 'business'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."portal_themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qoe_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "text" NOT NULL,
    "ap_name" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qoe_score" integer NOT NULL,
    "latency_p95_ms" numeric(8,2),
    "packet_loss_percentage" numeric(5,2),
    "throughput_mbps" numeric(8,2),
    "user_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "qoe_measurements_qoe_score_check" CHECK ((("qoe_score" >= 0) AND ("qoe_score" <= 100)))
);


ALTER TABLE "public"."qoe_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "order_num" integer DEFAULT 0
);


ALTER TABLE "public"."quiz_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid",
    "question" "text" NOT NULL,
    "question_type" "text" DEFAULT 'multiple_choice'::"text" NOT NULL,
    "required" boolean DEFAULT true,
    "order_num" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."radius_coa_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "nas_ip_address" "inet" NOT NULL,
    "nas_port_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "response_at" timestamp with time zone,
    "response_code" integer,
    "error_message" "text",
    CONSTRAINT "radius_coa_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['disconnect'::"text", 'coa'::"text"]))),
    CONSTRAINT "radius_coa_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'ack'::"text", 'nak'::"text", 'timeout'::"text"])))
);


ALTER TABLE "public"."radius_coa_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."radius_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid",
    "username" "text",
    "mac_address" "text",
    "ip_address" "inet",
    "nas_ip_address" "inet",
    "nas_port_id" "text",
    "profile_id" "uuid",
    "vlan_id" integer,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "stop_time" timestamp with time zone,
    "rx_bytes" bigint DEFAULT 0,
    "tx_bytes" bigint DEFAULT 0,
    "rx_packets" bigint DEFAULT 0,
    "tx_packets" bigint DEFAULT 0,
    "session_time" integer DEFAULT 0,
    "terminate_cause" "text",
    "state" "text" DEFAULT 'active'::"text" NOT NULL,
    "ap_name" "text",
    "ssid" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "radius_sessions_state_check" CHECK (("state" = ANY (ARRAY['active'::"text", 'stopped'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."radius_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referred_id" "uuid",
    "code" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "referrer_reward" integer,
    "referred_reward" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resellers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "commission_rate" numeric(5,2) DEFAULT 15.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resellers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "reward_type" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "value" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "admin_user_id" "uuid",
    "ip_address" "inet",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_resolved" boolean DEFAULT false,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "security_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'danger'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."security_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_availability_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uptime_percentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "downtime_minutes" integer DEFAULT 0 NOT NULL,
    "sla_breached" boolean DEFAULT false NOT NULL,
    "incident_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_availability_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reseller_id" "uuid",
    "name" "text" NOT NULL,
    "portal_slug" "text" NOT NULL,
    "location" "text",
    "type" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#5B4DFF'::"text",
    "welcome_msg" "text" DEFAULT 'Bienvenue ! Connectez-vous pour accéder à Internet.'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sites_type_check" CHECK (("type" = ANY (ARRAY['hotel'::"text", 'restaurant'::"text", 'campus'::"text", 'public'::"text", 'commerce'::"text", 'institution'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "plan_id" "uuid",
    "payment_method_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "status" "text" NOT NULL,
    "transaction_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "site_id" "uuid",
    "session_id" "uuid",
    "amount_fcfa" integer,
    "commission_fcfa" integer DEFAULT 0,
    "method" "text",
    "provider_ref" "text",
    "wave_checkout_id" "text"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "quota_used_mb" numeric DEFAULT 0,
    "minutes_used" integer DEFAULT 0,
    "last_reset_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_segment_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "segment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_segment_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "criteria" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone NOT NULL,
    "use_limit" integer DEFAULT 1,
    "used_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone,
    "site_id" "uuid",
    "plan_id" "uuid",
    "batch_name" "text",
    "used_by" "uuid",
    "expires_at" timestamp with time zone,
    "is_used" boolean DEFAULT false,
    CONSTRAINT "vouchers_check" CHECK (("used_count" <= "use_limit"))
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wifi_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "duration_minutes" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_family_plan" boolean DEFAULT false,
    "max_members" integer DEFAULT 1,
    "is_subscription" boolean DEFAULT false,
    "recurring_interval" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "site_id" "uuid",
    "duration_min" integer,
    "price_fcfa" integer,
    "speed_down_mb" integer DEFAULT 10,
    "speed_up_mb" integer DEFAULT 5,
    "data_limit_mb" integer,
    "max_devices" integer DEFAULT 1,
    "is_popular" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."wifi_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wifi_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "duration_minutes" integer DEFAULT 30,
    "is_active" boolean DEFAULT true,
    "engagement_type" "text",
    "engagement_data" "jsonb",
    "plan_id" "uuid",
    "transaction_id" "uuid",
    "device_info" "jsonb",
    "site_id" "uuid",
    "mac_address" "text",
    "ap_mac" "text",
    "ssid" "text",
    "expires_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."wifi_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wifi_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_method" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "name" "text",
    "mac_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_connection" timestamp with time zone DEFAULT "now"(),
    "loyalty_points" integer DEFAULT 0,
    "family_id" "uuid",
    "family_role" "text",
    "referral_code" "text",
    "preferences" "jsonb",
    "site_id" "uuid",
    "loyalty_pts" integer DEFAULT 0,
    "loyalty_level" "text" DEFAULT 'basic'::"text",
    "churn_risk" numeric(4,3) DEFAULT 0.0,
    "ai_segment" "text" DEFAULT 'new_user'::"text",
    "referred_by" "uuid",
    "is_blocked" boolean DEFAULT false
);


ALTER TABLE "public"."wifi_users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_profiles"
    ADD CONSTRAINT "access_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_videos"
    ADD CONSTRAINT "ad_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."ai_providers_config"
    ADD CONSTRAINT "ai_providers_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_config"
    ADD CONSTRAINT "audit_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_config"
    ADD CONSTRAINT "auth_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_funnel_metrics"
    ADD CONSTRAINT "auth_funnel_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_otp_config"
    ADD CONSTRAINT "auth_otp_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_analytics"
    ADD CONSTRAINT "chat_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_knowledge_base"
    ADD CONSTRAINT "chat_knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_satisfaction_metrics"
    ADD CONSTRAINT "customer_satisfaction_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_kpis"
    ADD CONSTRAINT "financial_kpis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hardware_integrations"
    ADD CONSTRAINT "hardware_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents_tracking"
    ADD CONSTRAINT "incidents_tracking_incident_id_key" UNIQUE ("incident_id");



ALTER TABLE ONLY "public"."incidents_tracking"
    ADD CONSTRAINT "incidents_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_levels"
    ADD CONSTRAINT "loyalty_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pc_admin_users"
    ADD CONSTRAINT "pc_admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."pc_admin_users"
    ADD CONSTRAINT "pc_admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pc_audit_logs"
    ADD CONSTRAINT "pc_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_analytics"
    ADD CONSTRAINT "portal_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_config"
    ADD CONSTRAINT "portal_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_customer_journeys"
    ADD CONSTRAINT "portal_customer_journeys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_customizations"
    ADD CONSTRAINT "portal_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_enabled_modules"
    ADD CONSTRAINT "portal_enabled_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_enabled_modules"
    ADD CONSTRAINT "portal_enabled_modules_portal_config_id_module_id_key" UNIQUE ("portal_config_id", "module_id");



ALTER TABLE ONLY "public"."portal_modules"
    ADD CONSTRAINT "portal_modules_module_name_key" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."portal_modules"
    ADD CONSTRAINT "portal_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_statistics"
    ADD CONSTRAINT "portal_statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_themes"
    ADD CONSTRAINT "portal_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qoe_measurements"
    ADD CONSTRAINT "qoe_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radius_coa_requests"
    ADD CONSTRAINT "radius_coa_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radius_sessions"
    ADD CONSTRAINT "radius_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radius_sessions"
    ADD CONSTRAINT "radius_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resellers"
    ADD CONSTRAINT "resellers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."resellers"
    ADD CONSTRAINT "resellers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_alerts"
    ADD CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_availability_metrics"
    ADD CONSTRAINT "site_availability_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_portal_slug_key" UNIQUE ("portal_slug");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_user_id_profile_id_key" UNIQUE ("user_id", "profile_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_segment_memberships"
    ADD CONSTRAINT "user_segment_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_segment_memberships"
    ADD CONSTRAINT "user_segment_memberships_user_id_segment_id_key" UNIQUE ("user_id", "segment_id");



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "user_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wifi_plans"
    ADD CONSTRAINT "wifi_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wifi_sessions"
    ADD CONSTRAINT "wifi_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wifi_users"
    ADD CONSTRAINT "wifi_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wifi_users"
    ADD CONSTRAINT "wifi_users_referral_code_key" UNIQUE ("referral_code");



CREATE INDEX "idx_admin_audit_logs_action_type" ON "public"."admin_audit_logs" USING "btree" ("action_type");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_criticality" ON "public"."admin_audit_logs" USING "btree" ("criticality");



CREATE INDEX "idx_admin_audit_logs_target" ON "public"."admin_audit_logs" USING "btree" ("target_entity", "target_id");



CREATE INDEX "idx_admin_audit_logs_user_id" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_sessions_active" ON "public"."admin_sessions" USING "btree" ("is_active", "last_activity");



CREATE INDEX "idx_admin_sessions_token" ON "public"."admin_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_admin_sessions_user_id" ON "public"."admin_sessions" USING "btree" ("admin_user_id");



CREATE INDEX "idx_auth_funnel_metrics_timestamp_method" ON "public"."auth_funnel_metrics" USING "btree" ("timestamp" DESC, "auth_method");



CREATE INDEX "idx_chat_analytics_date" ON "public"."chat_analytics" USING "btree" ("date");



CREATE INDEX "idx_chat_conversations_session_id" ON "public"."chat_conversations" USING "btree" ("session_id");



CREATE INDEX "idx_chat_conversations_status" ON "public"."chat_conversations" USING "btree" ("status");



CREATE INDEX "idx_chat_conversations_user_id" ON "public"."chat_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_chat_knowledge_base_category" ON "public"."chat_knowledge_base" USING "btree" ("category");



CREATE INDEX "idx_chat_knowledge_base_keywords" ON "public"."chat_knowledge_base" USING "gin" ("keywords");



CREATE INDEX "idx_chat_messages_conversation_id" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_created_at" ON "public"."chat_messages" USING "btree" ("created_at");



CREATE INDEX "idx_customer_satisfaction_metrics_date" ON "public"."customer_satisfaction_metrics" USING "btree" ("metric_date" DESC);



CREATE INDEX "idx_financial_kpis_date" ON "public"."financial_kpis" USING "btree" ("metric_date" DESC);



CREATE INDEX "idx_incidents_tracking_status_severity" ON "public"."incidents_tracking" USING "btree" ("status", "severity");



CREATE INDEX "idx_portal_analytics_portal_date" ON "public"."portal_analytics" USING "btree" ("portal_config_id", "metric_date");



CREATE INDEX "idx_portal_config_site_id" ON "public"."portal_config" USING "btree" ("site_id");



CREATE INDEX "idx_portal_config_wholesaler_id" ON "public"."portal_config" USING "btree" ("wholesaler_id");



CREATE INDEX "idx_portal_customizations_portal_id" ON "public"."portal_customizations" USING "btree" ("portal_config_id");



CREATE INDEX "idx_qoe_measurements_site_timestamp" ON "public"."qoe_measurements" USING "btree" ("site_id", "timestamp" DESC);



CREATE INDEX "idx_radius_sessions_session_id" ON "public"."radius_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_radius_sessions_start_time" ON "public"."radius_sessions" USING "btree" ("start_time");



CREATE INDEX "idx_radius_sessions_state" ON "public"."radius_sessions" USING "btree" ("state");



CREATE INDEX "idx_radius_sessions_user_id" ON "public"."radius_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_security_alerts_resolved" ON "public"."security_alerts" USING "btree" ("is_resolved");



CREATE INDEX "idx_security_alerts_severity" ON "public"."security_alerts" USING "btree" ("severity", "created_at" DESC);



CREATE INDEX "idx_security_alerts_user_id" ON "public"."security_alerts" USING "btree" ("admin_user_id");



CREATE INDEX "idx_site_availability_metrics_site_timestamp" ON "public"."site_availability_metrics" USING "btree" ("site_id", "timestamp" DESC);



CREATE INDEX "idx_user_access_user_id" ON "public"."user_access" USING "btree" ("user_id");



CREATE INDEX "idx_vouchers_active" ON "public"."vouchers" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_vouchers_code" ON "public"."vouchers" USING "btree" ("code");



CREATE INDEX "idx_wifi_users_mac_address" ON "public"."wifi_users" USING "btree" ("mac_address");



CREATE OR REPLACE TRIGGER "trigger_update_incident_mttr" BEFORE UPDATE ON "public"."incidents_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_incident_mttr"();



CREATE OR REPLACE TRIGGER "update_access_profiles_updated_at" BEFORE UPDATE ON "public"."access_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_auth_otp_config_updated_at" BEFORE UPDATE ON "public"."auth_otp_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_radius_sessions_updated_at" BEFORE UPDATE ON "public"."radius_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_access_updated_at" BEFORE UPDATE ON "public"."user_access" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."wifi_users"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."wifi_users"("id");



ALTER TABLE ONLY "public"."hardware_integrations"
    ADD CONSTRAINT "hardware_integrations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pc_admin_users"
    ADD CONSTRAINT "pc_admin_users_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id");



ALTER TABLE ONLY "public"."pc_audit_logs"
    ADD CONSTRAINT "pc_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."pc_admin_users"("id");



ALTER TABLE ONLY "public"."portal_analytics"
    ADD CONSTRAINT "portal_analytics_portal_config_id_fkey" FOREIGN KEY ("portal_config_id") REFERENCES "public"."portal_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_customer_journeys"
    ADD CONSTRAINT "portal_customer_journeys_portal_config_id_fkey" FOREIGN KEY ("portal_config_id") REFERENCES "public"."portal_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_customizations"
    ADD CONSTRAINT "portal_customizations_portal_config_id_fkey" FOREIGN KEY ("portal_config_id") REFERENCES "public"."portal_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_enabled_modules"
    ADD CONSTRAINT "portal_enabled_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."portal_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_enabled_modules"
    ADD CONSTRAINT "portal_enabled_modules_portal_config_id_fkey" FOREIGN KEY ("portal_config_id") REFERENCES "public"."portal_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."radius_coa_requests"
    ADD CONSTRAINT "radius_coa_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."radius_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."radius_sessions"
    ADD CONSTRAINT "radius_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."access_profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."wifi_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."wifi_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."wifi_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."wifi_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."access_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_segment_memberships"
    ADD CONSTRAINT "user_segment_memberships_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."user_segments"("id");



ALTER TABLE ONLY "public"."user_segment_memberships"
    ADD CONSTRAINT "user_segment_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."wifi_users"("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."access_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."wifi_plans"
    ADD CONSTRAINT "wifi_plans_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."wifi_sessions"
    ADD CONSTRAINT "wifi_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."wifi_plans"("id");



ALTER TABLE ONLY "public"."wifi_sessions"
    ADD CONSTRAINT "wifi_sessions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."wifi_sessions"
    ADD CONSTRAINT "wifi_sessions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."wifi_sessions"
    ADD CONSTRAINT "wifi_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."wifi_users"("id");



ALTER TABLE ONLY "public"."wifi_users"
    ADD CONSTRAINT "wifi_users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



CREATE POLICY "Admin access to chat_conversations" ON "public"."chat_conversations" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "Admin access to chat_messages" ON "public"."chat_messages" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "Admin access to events" ON "public"."events" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "Admin access to wifi_sessions" ON "public"."wifi_sessions" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "Allow public read" ON "public"."ad_videos" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read" ON "public"."chat_knowledge_base" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."games" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read" ON "public"."loyalty_levels" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."payment_methods" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read" ON "public"."portal_modules" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."portal_themes" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."quiz_options" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."quiz_questions" FOR SELECT USING (true);



CREATE POLICY "Allow public read" ON "public"."quizzes" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read" ON "public"."rewards" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read" ON "public"."wifi_plans" FOR SELECT USING (("active" = true));



CREATE POLICY "No access" ON "public"."admin_audit_logs" USING (false);



CREATE POLICY "No access" ON "public"."admin_sessions" USING (false);



CREATE POLICY "No access" ON "public"."ai_providers_config" USING (false);



CREATE POLICY "No access" ON "public"."audit_config" USING (false);



CREATE POLICY "No access" ON "public"."auth_config" USING (false);



CREATE POLICY "No access" ON "public"."portal_config" USING (false);



CREATE POLICY "No access" ON "public"."portal_customer_journeys" USING (false);



CREATE POLICY "No access" ON "public"."portal_customizations" USING (false);



CREATE POLICY "No access" ON "public"."portal_enabled_modules" USING (false);



CREATE POLICY "No access" ON "public"."referrals" USING (false);



CREATE POLICY "No access" ON "public"."security_alerts" USING (false);



CREATE POLICY "System can create chat messages" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND ("cc"."user_id" = "auth"."uid"())))));



CREATE POLICY "System can create user sessions" ON "public"."wifi_sessions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own conversations" ON "public"."chat_conversations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own conversations" ON "public"."chat_conversations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view messages from their conversations" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND (("cc"."user_id" = "auth"."uid"()) OR "public"."is_admin_user"())))));



CREATE POLICY "Users can view their own conversations" ON "public"."chat_conversations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."access_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "access_profiles_admin_only" ON "public"."access_profiles" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."ad_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_manage_hardware" ON "public"."hardware_integrations" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_resellers" ON "public"."resellers" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_sites" ON "public"."sites" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_transactions" ON "public"."transactions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_vouchers" ON "public"."vouchers" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_wifi_sessions" ON "public"."wifi_sessions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_manage_wifi_users" ON "public"."wifi_users" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "admin_read_audit_logs" ON "public"."pc_audit_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_manage_roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."ai_providers_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_funnel_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_funnel_metrics_admin_only" ON "public"."auth_funnel_metrics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."auth_otp_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_otp_config_admin_only" ON "public"."auth_otp_config" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."chat_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_analytics_admin_only" ON "public"."chat_analytics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_conversations_final_admin_delete" ON "public"."chat_conversations" FOR DELETE TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "chat_conversations_final_user_create" ON "public"."chat_conversations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "chat_conversations_final_user_read" ON "public"."chat_conversations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "chat_conversations_final_user_update" ON "public"."chat_conversations" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



ALTER TABLE "public"."chat_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_final_admin_access" ON "public"."chat_messages" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "chat_messages_final_user_create" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND ("cc"."user_id" = "auth"."uid"())))));



CREATE POLICY "chat_messages_final_user_read" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND (("cc"."user_id" = "auth"."uid"()) OR "public"."is_admin_user"())))));



ALTER TABLE "public"."customer_satisfaction_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_satisfaction_metrics_admin_only" ON "public"."customer_satisfaction_metrics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_kpis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_kpis_admin_only" ON "public"."financial_kpis" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hardware_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hardware_read_authenticated" ON "public"."hardware_integrations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."incidents_tracking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incidents_tracking_admin_only" ON "public"."incidents_tracking" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."loyalty_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pc_admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pc_admin_users_read_authenticated" ON "public"."pc_admin_users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pc_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pc_audit_logs_read_authenticated" ON "public"."pc_audit_logs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."portal_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_analytics_admin_only" ON "public"."portal_analytics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."portal_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_customer_journeys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_customizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_enabled_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_statistics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_statistics_admin_only" ON "public"."portal_statistics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."portal_themes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_active_plans" ON "public"."wifi_plans" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "public_read_active_sites" ON "public"."sites" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."qoe_measurements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qoe_measurements_admin_only" ON "public"."qoe_measurements" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."quiz_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."radius_coa_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."radius_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "radius_sessions_admin_full_access" ON "public"."radius_sessions" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "radius_sessions_system_management" ON "public"."radius_sessions" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "radius_sessions_system_update" ON "public"."radius_sessions" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "radius_sessions_user_own_only" ON "public"."radius_sessions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resellers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resellers_read_authenticated" ON "public"."resellers" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "secure_admin_audit_logs_no_access" ON "public"."admin_audit_logs" TO "authenticated" USING (false);



CREATE POLICY "secure_admin_sessions_no_access" ON "public"."admin_sessions" TO "authenticated" USING (false);



CREATE POLICY "secure_ai_providers_config_no_access" ON "public"."ai_providers_config" TO "authenticated" USING (false);



CREATE POLICY "secure_chat_conversations_delete" ON "public"."chat_conversations" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_chat_conversations_insert" ON "public"."chat_conversations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "secure_chat_conversations_select" ON "public"."chat_conversations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_chat_conversations_update" ON "public"."chat_conversations" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_chat_messages_admin" ON "public"."chat_messages" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "secure_chat_messages_insert" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND ("cc"."user_id" = "auth"."uid"())))));



CREATE POLICY "secure_chat_messages_select" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "cc"
  WHERE (("cc"."id" = "chat_messages"."conversation_id") AND (("cc"."user_id" = "auth"."uid"()) OR "public"."is_admin_user"())))));



CREATE POLICY "secure_events_admin" ON "public"."events" TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "secure_events_insert" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "secure_events_select" ON "public"."events" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_radius_coa_admin_only" ON "public"."radius_coa_requests" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_radius_sessions_system_insert" ON "public"."radius_sessions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_radius_sessions_system_update" ON "public"."radius_sessions" FOR UPDATE TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_radius_sessions_user_read" ON "public"."radius_sessions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_security_alerts_no_access" ON "public"."security_alerts" TO "authenticated" USING (false);



CREATE POLICY "secure_transactions_admin_update" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_transactions_system_only" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_transactions_user_read" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "secure_user_access_admin_only" ON "public"."user_access" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_vouchers_admin_only" ON "public"."vouchers" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "secure_wifi_users_registration" ON "public"."wifi_users" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "id") AND ("email" IS NOT NULL) AND ("auth_method" IS NOT NULL)));



ALTER TABLE "public"."security_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_availability_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_availability_metrics_admin_only" ON "public"."site_availability_metrics" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_final_admin_delete" ON "public"."transactions" FOR DELETE TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "transactions_final_admin_only" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "transactions_final_admin_update" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "transactions_final_user_read" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "transactions_system_create" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_segment_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_segment_memberships_admin_only" ON "public"."user_segment_memberships" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "user_segment_memberships_user_select" ON "public"."user_segment_memberships" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_segments_admin_only" ON "public"."user_segments" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "users_read_own_roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wifi_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wifi_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wifi_sessions_admin_full_access" ON "public"."wifi_sessions" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "wifi_sessions_final_admin_management" ON "public"."wifi_sessions" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "wifi_sessions_final_user_read" ON "public"."wifi_sessions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_user"()));



CREATE POLICY "wifi_sessions_portal_anon_insert" ON "public"."wifi_sessions" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "wifi_sessions_portal_anon_select" ON "public"."wifi_sessions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "wifi_sessions_portal_anon_update" ON "public"."wifi_sessions" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "wifi_sessions_user_create_own" ON "public"."wifi_sessions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wifi_sessions_user_update_own" ON "public"."wifi_sessions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."wifi_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wifi_users_admin_full_access" ON "public"."wifi_users" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "wifi_users_final_admin_management" ON "public"."wifi_users" TO "authenticated" USING ("public"."is_admin_user"()) WITH CHECK ("public"."is_admin_user"());



CREATE POLICY "wifi_users_final_secure_registration" ON "public"."wifi_users" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "id") AND ("email" IS NOT NULL) AND ("auth_method" IS NOT NULL) AND ("name" IS NOT NULL)));



CREATE POLICY "wifi_users_final_user_select" ON "public"."wifi_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "wifi_users_final_user_update" ON "public"."wifi_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "wifi_users_own_profile_only" ON "public"."wifi_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "wifi_users_own_profile_update" ON "public"."wifi_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "wifi_users_portal_anon_insert" ON "public"."wifi_users" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "wifi_users_public_read_by_site" ON "public"."wifi_users" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "wifi_users_registration" ON "public"."wifi_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_apply_quota"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_apply_quota"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_apply_quota"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_realtime_dashboard_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_realtime_dashboard_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_realtime_dashboard_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_dashboard_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_dashboard_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_dashboard_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_incident_mttr"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_incident_mttr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_incident_mttr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."access_profiles" TO "anon";
GRANT ALL ON TABLE "public"."access_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."access_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ad_videos" TO "anon";
GRANT ALL ON TABLE "public"."ad_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_videos" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers_config" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers_config" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers_config" TO "service_role";



GRANT ALL ON TABLE "public"."audit_config" TO "anon";
GRANT ALL ON TABLE "public"."audit_config" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_config" TO "service_role";



GRANT ALL ON TABLE "public"."auth_config" TO "anon";
GRANT ALL ON TABLE "public"."auth_config" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_config" TO "service_role";



GRANT ALL ON TABLE "public"."auth_funnel_metrics" TO "anon";
GRANT ALL ON TABLE "public"."auth_funnel_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_funnel_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."auth_otp_config" TO "anon";
GRANT ALL ON TABLE "public"."auth_otp_config" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_otp_config" TO "service_role";



GRANT ALL ON TABLE "public"."chat_analytics" TO "anon";
GRANT ALL ON TABLE "public"."chat_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."chat_knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."chat_knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."customer_satisfaction_metrics" TO "anon";
GRANT ALL ON TABLE "public"."customer_satisfaction_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_satisfaction_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."financial_kpis" TO "anon";
GRANT ALL ON TABLE "public"."financial_kpis" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."hardware_integrations" TO "anon";
GRANT ALL ON TABLE "public"."hardware_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."hardware_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."incidents_tracking" TO "anon";
GRANT ALL ON TABLE "public"."incidents_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_levels" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_levels" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."pc_admin_users" TO "anon";
GRANT ALL ON TABLE "public"."pc_admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."pc_admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."pc_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."pc_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."pc_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."portal_analytics" TO "anon";
GRANT ALL ON TABLE "public"."portal_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."portal_config" TO "anon";
GRANT ALL ON TABLE "public"."portal_config" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_config" TO "service_role";



GRANT ALL ON TABLE "public"."portal_customer_journeys" TO "anon";
GRANT ALL ON TABLE "public"."portal_customer_journeys" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_customer_journeys" TO "service_role";



GRANT ALL ON TABLE "public"."portal_customizations" TO "anon";
GRANT ALL ON TABLE "public"."portal_customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_customizations" TO "service_role";



GRANT ALL ON TABLE "public"."portal_enabled_modules" TO "anon";
GRANT ALL ON TABLE "public"."portal_enabled_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_enabled_modules" TO "service_role";



GRANT ALL ON TABLE "public"."portal_modules" TO "anon";
GRANT ALL ON TABLE "public"."portal_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_modules" TO "service_role";



GRANT ALL ON TABLE "public"."portal_statistics" TO "anon";
GRANT ALL ON TABLE "public"."portal_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."portal_themes" TO "anon";
GRANT ALL ON TABLE "public"."portal_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_themes" TO "service_role";



GRANT ALL ON TABLE "public"."qoe_measurements" TO "anon";
GRANT ALL ON TABLE "public"."qoe_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."qoe_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_options" TO "anon";
GRANT ALL ON TABLE "public"."quiz_options" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_options" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."radius_coa_requests" TO "anon";
GRANT ALL ON TABLE "public"."radius_coa_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."radius_coa_requests" TO "service_role";



GRANT ALL ON TABLE "public"."radius_sessions" TO "anon";
GRANT ALL ON TABLE "public"."radius_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."radius_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."resellers" TO "anon";
GRANT ALL ON TABLE "public"."resellers" TO "authenticated";
GRANT ALL ON TABLE "public"."resellers" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."security_alerts" TO "anon";
GRANT ALL ON TABLE "public"."security_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."security_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."site_availability_metrics" TO "anon";
GRANT ALL ON TABLE "public"."site_availability_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."site_availability_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_access" TO "anon";
GRANT ALL ON TABLE "public"."user_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_segment_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_segment_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_segment_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_segments" TO "anon";
GRANT ALL ON TABLE "public"."user_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_segments" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



GRANT ALL ON TABLE "public"."wifi_plans" TO "anon";
GRANT ALL ON TABLE "public"."wifi_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."wifi_plans" TO "service_role";



GRANT ALL ON TABLE "public"."wifi_sessions" TO "anon";
GRANT ALL ON TABLE "public"."wifi_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."wifi_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."wifi_users" TO "anon";
GRANT ALL ON TABLE "public"."wifi_users" TO "authenticated";
GRANT ALL ON TABLE "public"."wifi_users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























