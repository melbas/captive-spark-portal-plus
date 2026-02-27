-- ============================================================
-- PremiumConnect — Initialisation PostgreSQL
-- Knowledge v3.0 — 10 tables + extensions
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Full-text search

-- Base MLflow séparée
CREATE DATABASE mlflow;

-- ============================================================
-- TABLE 1 : resellers
-- ============================================================
CREATE TABLE IF NOT EXISTS resellers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT,
  address         TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 15.00 CHECK (commission_rate >= 0 AND commission_rate <= 30),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 2 : sites
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id      UUID REFERENCES resellers(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_sites_portal_slug ON sites(portal_slug);
CREATE INDEX IF NOT EXISTS idx_sites_reseller_id ON sites(reseller_id);

-- ============================================================
-- TABLE 3 : hardware_integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS hardware_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES sites(id) ON DELETE CASCADE,
  brand            TEXT NOT NULL CHECK (brand IN ('ubiquiti','mikrotik','cisco','huawei','tplink')),
  controller_url   TEXT NOT NULL,
  api_username     TEXT,
  api_password_enc TEXT,  -- Chiffré AES-256-GCM via pgcrypto
  unifi_site_id    TEXT DEFAULT 'default',
  is_active        BOOLEAN DEFAULT true,
  last_tested_at   TIMESTAMPTZ,
  last_test_ok     BOOLEAN,
  last_test_msg    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 4 : wifi_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS wifi_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  duration_min  INT NOT NULL CHECK (duration_min > 0),
  price_fcfa    INT NOT NULL CHECK (price_fcfa >= 0),
  speed_down_mb INT DEFAULT 10,
  speed_up_mb   INT DEFAULT 5,
  data_limit_mb INT,  -- NULL = illimité
  max_devices   INT DEFAULT 1,
  is_popular    BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wifi_plans_site_id ON wifi_plans(site_id);

-- ============================================================
-- TABLE 5 : wifi_users
-- ============================================================
CREATE TABLE IF NOT EXISTS wifi_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id),
  phone         TEXT,
  email         TEXT,
  name          TEXT,
  loyalty_pts   INT DEFAULT 0,
  loyalty_level TEXT DEFAULT 'basic' CHECK (loyalty_level IN ('basic','bronze','silver','gold','platinum')),
  -- Champs IA (mis à jour uniquement côté serveur — Règle 9)
  churn_risk    DECIMAL(4,3) DEFAULT 0.0 CHECK (churn_risk >= 0 AND churn_risk <= 1),
  ai_segment    TEXT DEFAULT 'new_user' CHECK (ai_segment IN (
                  'new_user','loyal_customer','price_sensitive',
                  'weekend_user','high_value','at_risk','churner'
                )),
  referral_code TEXT UNIQUE,
  referred_by   UUID REFERENCES wifi_users(id),
  is_blocked    BOOLEAN DEFAULT false,
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, phone),
  UNIQUE(site_id, email)
);

CREATE INDEX IF NOT EXISTS idx_wifi_users_site_id ON wifi_users(site_id);
CREATE INDEX IF NOT EXISTS idx_wifi_users_churn_risk ON wifi_users(churn_risk DESC);
CREATE INDEX IF NOT EXISTS idx_wifi_users_ai_segment ON wifi_users(ai_segment);

-- ============================================================
-- TABLE 6 : wifi_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS wifi_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id),
  user_id     UUID REFERENCES wifi_users(id),
  plan_id     UUID REFERENCES wifi_plans(id),
  mac_address TEXT NOT NULL,  -- Adresse MAC réelle depuis ?id= URL (Règle 1)
  ap_mac      TEXT,
  ssid        TEXT,
  started_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked'))
);

CREATE INDEX IF NOT EXISTS idx_wifi_sessions_site_id ON wifi_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_wifi_sessions_status ON wifi_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wifi_sessions_mac ON wifi_sessions(mac_address);
CREATE INDEX IF NOT EXISTS idx_wifi_sessions_expires ON wifi_sessions(expires_at) WHERE status = 'active';

-- ============================================================
-- TABLE 7 : transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES sites(id),
  user_id          UUID REFERENCES wifi_users(id),
  session_id       UUID REFERENCES wifi_sessions(id),
  plan_id          UUID REFERENCES wifi_plans(id),
  amount_fcfa      INT NOT NULL CHECK (amount_fcfa >= 0),
  commission_fcfa  INT DEFAULT 0,
  method           TEXT CHECK (method IN ('wave','orange_money','free_money','voucher','free','admin')),
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  provider_ref     TEXT,
  wave_checkout_id TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_site_id ON transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================
-- TABLE 8 : vouchers
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id),
  plan_id    UUID REFERENCES wifi_plans(id),
  code       TEXT UNIQUE NOT NULL,  -- 8 caractères alphanumériques majuscules
  batch_name TEXT,
  used_by    UUID REFERENCES wifi_users(id),
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_used    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_site_id ON vouchers(site_id);

-- ============================================================
-- TABLE 9 : admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id   UUID REFERENCES resellers(id),  -- NULL = super_admin
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt
  name          TEXT,
  role          TEXT DEFAULT 'reseller_viewer' CHECK (role IN ('super_admin','reseller_admin','reseller_viewer')),
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 10 : audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- DONNÉES DE DÉMARRAGE
-- ============================================================

-- Super admin par défaut (mot de passe: Admin@2024! — À CHANGER EN PRODUCTION)
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@premiumconnect.sn',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2BZJXHvqNO',
  'Super Administrateur',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Revendeur de démonstration
INSERT INTO resellers (id, name, email, phone, commission_rate)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Revendeur Démo Dakar',
  'demo@premiumconnect.sn',
  '+221770000001',
  15.00
) ON CONFLICT DO NOTHING;

-- Site de démonstration
INSERT INTO sites (id, reseller_id, name, portal_slug, location, type, welcome_msg)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Hôtel Teranga Dakar',
  'hotel-teranga-dakar',
  'Dakar, Sénégal',
  'hotel',
  'Bienvenue à l''Hôtel Teranga ! Connectez-vous pour profiter du WiFi haut débit.'
) ON CONFLICT DO NOTHING;

-- Forfaits par défaut pour le site démo
INSERT INTO wifi_plans (site_id, name, duration_min, price_fcfa, speed_down_mb, speed_up_mb, max_devices, is_popular, sort_order)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Journalier',   1440,  300,   5,  2, 1, false, 1),
  ('b0000000-0000-0000-0000-000000000001', '3 Jours',      4320,  500,   5,  2, 1, false, 2),
  ('b0000000-0000-0000-0000-000000000001', 'Hebdomadaire', 10080, 1000,  10, 5, 1, true,  3),
  ('b0000000-0000-0000-0000-000000000001', 'Mensuel',      43200, 3000,  10, 5, 1, false, 4),
  ('b0000000-0000-0000-0000-000000000001', 'Famille',      43200, 10000, 20, 10, 5, false, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- EXPIRATION AUTOMATIQUE DES SESSIONS (pg_cron)
-- Nécessite l'extension pg_cron (disponible sur PostgreSQL 16)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-sessions', '* * * * *',
--   $$UPDATE wifi_sessions SET status='expired', ended_at=now()
--     WHERE status='active' AND expires_at < now()$$);

-- ============================================================
-- VUES ANALYTIQUES (KPIs Dashboard)
-- ============================================================

-- Vue : sessions actives en temps réel
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
  ws.id, ws.site_id, ws.mac_address, ws.ssid,
  ws.started_at, ws.expires_at,
  wu.phone, wu.name, wu.loyalty_level,
  wp.name AS plan_name, wp.price_fcfa,
  s.name AS site_name, r.name AS reseller_name
FROM wifi_sessions ws
JOIN sites s ON s.id = ws.site_id
JOIN resellers r ON r.id = s.reseller_id
LEFT JOIN wifi_users wu ON wu.id = ws.user_id
LEFT JOIN wifi_plans wp ON wp.id = ws.plan_id
WHERE ws.status = 'active' AND ws.expires_at > now();

-- Vue : revenus du jour par site
CREATE OR REPLACE VIEW v_revenue_today AS
SELECT
  t.site_id,
  s.name AS site_name,
  r.name AS reseller_name,
  COUNT(*) AS transactions_count,
  SUM(t.amount_fcfa) AS revenue_fcfa,
  SUM(t.commission_fcfa) AS commission_fcfa
FROM transactions t
JOIN sites s ON s.id = t.site_id
JOIN resellers r ON r.id = s.reseller_id
WHERE t.status = 'completed'
  AND t.completed_at >= date_trunc('day', now())
GROUP BY t.site_id, s.name, r.name;

-- Vue : utilisateurs à risque de churn
CREATE OR REPLACE VIEW v_at_risk_users AS
SELECT
  wu.id, wu.site_id, wu.phone, wu.email, wu.name,
  wu.loyalty_pts, wu.loyalty_level,
  wu.churn_risk,
  CASE
    WHEN wu.churn_risk >= 0.80 THEN 'critical'
    WHEN wu.churn_risk >= 0.60 THEN 'high'
    WHEN wu.churn_risk >= 0.40 THEN 'medium'
    ELSE 'low'
  END AS churn_risk_level,
  wu.ai_segment,
  wu.last_seen_at,
  s.name AS site_name
FROM wifi_users wu
JOIN sites s ON s.id = wu.site_id
WHERE wu.churn_risk >= 0.40 AND wu.is_blocked = false
ORDER BY wu.churn_risk DESC;
