import {
  pgTable, uuid, text, integer, decimal, boolean,
  timestamp, jsonb, pgEnum, uniqueIndex, index
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const siteTypeEnum = pgEnum('site_type', ['hotel','restaurant','campus','public','commerce','institution','other']);
export const hardwareBrandEnum = pgEnum('hardware_brand', ['ubiquiti','mikrotik','cisco','huawei','tplink']);
export const sessionStatusEnum = pgEnum('session_status', ['active','expired','revoked']);
export const txMethodEnum = pgEnum('tx_method', ['wave','orange_money','free_money','voucher','free','admin']);
export const txStatusEnum = pgEnum('tx_status', ['pending','completed','failed','refunded']);
export const loyaltyLevelEnum = pgEnum('loyalty_level', ['basic','bronze','silver','gold','platinum']);
export const aiSegmentEnum = pgEnum('ai_segment', ['new_user','loyal_customer','price_sensitive','weekend_user','high_value','at_risk','churner']);
export const adminRoleEnum = pgEnum('admin_role', ['super_admin','reseller_admin','reseller_viewer']);

// ─── Table 1 : resellers ──────────────────────────────────────────────────────
export const resellers = pgTable('resellers', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           text('name').notNull(),
  email:          text('email').unique(),
  phone:          text('phone'),
  address:        text('address'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('15.00'),
  isActive:       boolean('is_active').default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Table 2 : sites ──────────────────────────────────────────────────────────
export const sites = pgTable('sites', {
  id:               uuid('id').primaryKey().defaultRandom(),
  resellerId:       uuid('reseller_id').references(() => resellers.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  portalSlug:       text('portal_slug').unique().notNull(),
  location:         text('location'),
  type:             siteTypeEnum('type'),
  logoUrl:          text('logo_url'),
  primaryColor:     text('primary_color').default('#5B4DFF'),
  welcomeMsg:       text('welcome_msg').default('Bienvenue ! Connectez-vous pour accéder à Internet.'),
  whatsappSupport:  text('whatsapp_support'),
  isActive:         boolean('is_active').default(true),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  slugIdx:      uniqueIndex('idx_sites_portal_slug').on(t.portalSlug),
  resellerIdx:  index('idx_sites_reseller_id').on(t.resellerId),
}));

// ─── Table 3 : hardware_integrations ─────────────────────────────────────────
export const hardwareIntegrations = pgTable('hardware_integrations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  siteId:          uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  brand:           hardwareBrandEnum('brand').notNull(),
  controllerUrl:   text('controller_url').notNull(),
  apiUsername:     text('api_username'),
  apiPasswordEnc:  text('api_password_enc'),  // AES-256-GCM chiffré
  unifiSiteId:     text('unifi_site_id').default('default'),
  isActive:        boolean('is_active').default(true),
  lastTestedAt:    timestamp('last_tested_at', { withTimezone: true }),
  lastTestOk:      boolean('last_test_ok'),
  lastTestMsg:     text('last_test_msg'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Table 4 : wifi_plans ─────────────────────────────────────────────────────
export const wifiPlans = pgTable('wifi_plans', {
  id:           uuid('id').primaryKey().defaultRandom(),
  siteId:       uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  durationMin:  integer('duration_min').notNull(),
  priceFcfa:    integer('price_fcfa').notNull(),
  speedDownMb:  integer('speed_down_mb').default(10),
  speedUpMb:    integer('speed_up_mb').default(5),
  dataLimitMb:  integer('data_limit_mb'),  // NULL = illimité
  maxDevices:   integer('max_devices').default(1),
  isPopular:    boolean('is_popular').default(false),
  isActive:     boolean('is_active').default(true),
  sortOrder:    integer('sort_order').default(0),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  siteIdx: index('idx_wifi_plans_site_id').on(t.siteId),
}));

// ─── Table 5 : wifi_users ─────────────────────────────────────────────────────
export const wifiUsers = pgTable('wifi_users', {
  id:            uuid('id').primaryKey().defaultRandom(),
  siteId:        uuid('site_id').references(() => sites.id),
  phone:         text('phone'),
  email:         text('email'),
  name:          text('name'),
  loyaltyPts:    integer('loyalty_pts').default(0),
  loyaltyLevel:  loyaltyLevelEnum('loyalty_level').default('basic'),
  churnRisk:     decimal('churn_risk', { precision: 4, scale: 3 }).default('0.0'),
  aiSegment:     aiSegmentEnum('ai_segment').default('new_user'),
  referralCode:  text('referral_code').unique(),
  referredBy:    uuid('referred_by'),
  isBlocked:     boolean('is_blocked').default(false),
  lastSeenAt:    timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  siteIdx:       index('idx_wifi_users_site_id').on(t.siteId),
  churnRiskIdx:  index('idx_wifi_users_churn_risk').on(t.churnRisk),
  aiSegmentIdx:  index('idx_wifi_users_ai_segment').on(t.aiSegment),
}));

// ─── Table 6 : wifi_sessions ──────────────────────────────────────────────────
export const wifiSessions = pgTable('wifi_sessions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  siteId:     uuid('site_id').references(() => sites.id),
  userId:     uuid('user_id').references(() => wifiUsers.id),
  planId:     uuid('plan_id').references(() => wifiPlans.id),
  macAddress: text('mac_address').notNull(),
  apMac:      text('ap_mac'),
  ssid:       text('ssid'),
  startedAt:  timestamp('started_at', { withTimezone: true }).defaultNow(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  endedAt:    timestamp('ended_at', { withTimezone: true }),
  status:     sessionStatusEnum('status').default('active'),
}, (t) => ({
  siteIdx:    index('idx_wifi_sessions_site_id').on(t.siteId),
  statusIdx:  index('idx_wifi_sessions_status').on(t.status),
  macIdx:     index('idx_wifi_sessions_mac').on(t.macAddress),
}));

// ─── Table 7 : transactions ───────────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  siteId:          uuid('site_id').references(() => sites.id),
  userId:          uuid('user_id').references(() => wifiUsers.id),
  sessionId:       uuid('session_id').references(() => wifiSessions.id),
  planId:          uuid('plan_id').references(() => wifiPlans.id),
  amountFcfa:      integer('amount_fcfa').notNull(),
  commissionFcfa:  integer('commission_fcfa').default(0),
  method:          txMethodEnum('method'),
  status:          txStatusEnum('status').default('pending'),
  providerRef:     text('provider_ref'),
  waveCheckoutId:  text('wave_checkout_id'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt:     timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  siteIdx:      index('idx_transactions_site_id').on(t.siteId),
  statusIdx:    index('idx_transactions_status').on(t.status),
  createdIdx:   index('idx_transactions_created_at').on(t.createdAt),
}));

// ─── Table 8 : vouchers ───────────────────────────────────────────────────────
export const vouchers = pgTable('vouchers', {
  id:        uuid('id').primaryKey().defaultRandom(),
  siteId:    uuid('site_id').references(() => sites.id),
  planId:    uuid('plan_id').references(() => wifiPlans.id),
  code:      text('code').unique().notNull(),
  batchName: text('batch_name'),
  usedBy:    uuid('used_by').references(() => wifiUsers.id),
  usedAt:    timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isUsed:    boolean('is_used').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  codeIdx:   uniqueIndex('idx_vouchers_code').on(t.code),
  siteIdx:   index('idx_vouchers_site_id').on(t.siteId),
}));

// ─── Table 9 : admin_users ────────────────────────────────────────────────────
export const adminUsers = pgTable('admin_users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  resellerId:   uuid('reseller_id').references(() => resellers.id),
  email:        text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name:         text('name'),
  role:         adminRoleEnum('role').default('reseller_viewer'),
  isActive:     boolean('is_active').default(true),
  lastLoginAt:  timestamp('last_login_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Table 10 : audit_logs ────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  adminId:    uuid('admin_id').references(() => adminUsers.id),
  action:     text('action').notNull(),
  entityType: text('entity_type'),
  entityId:   uuid('entity_id'),
  details:    jsonb('details'),
  ipAddress:  text('ip_address'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  adminIdx:   index('idx_audit_logs_admin_id').on(t.adminId),
  createdIdx: index('idx_audit_logs_created_at').on(t.createdAt),
}));

// ─── Types inférés ────────────────────────────────────────────────────────────
export type Reseller = typeof resellers.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type HardwareIntegration = typeof hardwareIntegrations.$inferSelect;
export type WifiPlan = typeof wifiPlans.$inferSelect;
export type WifiUser = typeof wifiUsers.$inferSelect;
export type WifiSession = typeof wifiSessions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
