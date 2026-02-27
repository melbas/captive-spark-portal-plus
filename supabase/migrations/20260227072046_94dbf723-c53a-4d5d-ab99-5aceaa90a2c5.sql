
-- ============================================================
-- PremiumConnect — Migration Phase 1 : Tables fondations
-- 3 nouvelles tables : resellers, sites, hardware_integrations
-- ============================================================

-- Table 1 : resellers
CREATE TABLE IF NOT EXISTS public.resellers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT,
  address         TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Table 2 : sites
CREATE TABLE IF NOT EXISTS public.sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id      UUID REFERENCES public.resellers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  portal_slug      TEXT UNIQUE NOT NULL,
  location         TEXT,
  type             TEXT CHECK (type IN ('hotel','restaurant','campus','public','commerce','institution','other')),
  logo_url         TEXT,
  primary_color    TEXT DEFAULT '#5B4DFF',
  welcome_msg      TEXT DEFAULT 'Bienvenue ! Connectez-vous pour accéder à Internet.',
  whatsapp_support TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Table 3 : hardware_integrations
CREATE TABLE IF NOT EXISTS public.hardware_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  brand            TEXT CHECK (brand IN ('ubiquiti','mikrotik','cisco','huawei','tplink')),
  controller_url   TEXT NOT NULL,
  api_username     TEXT,
  api_password_enc TEXT,
  unifi_site_id    TEXT DEFAULT 'default',
  is_active        BOOLEAN DEFAULT true,
  last_tested_at   TIMESTAMPTZ,
  last_test_ok     BOOLEAN,
  last_test_msg    TEXT
);

-- Table 9 : pc_admin_users (prefixed to avoid conflict with existing admin tables)
CREATE TABLE IF NOT EXISTS public.pc_admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id   UUID REFERENCES public.resellers(id),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'reseller_viewer' CHECK (role IN ('super_admin','reseller_admin','reseller_viewer')),
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Table 10 : pc_audit_logs (prefixed to avoid conflict)
CREATE TABLE IF NOT EXISTS public.pc_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES public.pc_admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to existing wifi_users
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS loyalty_pts INT DEFAULT 0;
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS loyalty_level TEXT DEFAULT 'basic';
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS churn_risk DECIMAL(4,3) DEFAULT 0.0;
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS ai_segment TEXT DEFAULT 'new_user';
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE public.wifi_users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Add missing columns to existing wifi_sessions
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS mac_address TEXT;
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS ap_mac TEXT;
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS ssid TEXT;
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.wifi_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add missing columns to existing transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount_fcfa INT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission_fcfa INT DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider_ref TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wave_checkout_id TEXT;

-- Add missing columns to existing vouchers
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS batch_name TEXT;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS used_by UUID;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;

-- Add missing columns to existing wifi_plans
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS duration_min INT;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS price_fcfa INT;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS speed_down_mb INT DEFAULT 10;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS speed_up_mb INT DEFAULT 5;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS data_limit_mb INT;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS max_devices INT DEFAULT 1;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.wifi_plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_audit_logs ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE policies for public read
CREATE POLICY "public_read_active_sites" ON public.sites
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "public_read_active_plans" ON public.wifi_plans
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Service role handles all writes via Edge Functions (bypass RLS)
