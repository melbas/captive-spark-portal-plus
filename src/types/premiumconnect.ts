// ============================================================
// PremiumConnect — Types partagés v3.0
// NE PAS modifier. NE PAS redéfinir ailleurs.
// ============================================================

export type LoyaltyLevel = 'basic' | 'bronze' | 'silver' | 'gold' | 'platinum';
export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'voucher' | 'free' | 'admin';
export type HardwareBrand = 'ubiquiti' | 'mikrotik' | 'cisco' | 'huawei' | 'tplink';
export type SessionStatus = 'active' | 'expired' | 'revoked';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type AdminRole = 'super_admin' | 'reseller_admin' | 'reseller_viewer';
export type SiteType = 'hotel' | 'restaurant' | 'campus' | 'public' | 'commerce' | 'institution' | 'other';

// Segments IA calculés par le modèle de clustering ML
export type AISegment =
  | 'new_user'
  | 'loyal_customer'
  | 'price_sensitive'
  | 'weekend_user'
  | 'high_value'
  | 'at_risk'
  | 'churner';

// Niveaux de risque de churn (calculé par le modèle XGBoost)
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export function getChurnRiskLevel(score: number): ChurnRisk {
  if (score < 0.30) return 'low';
  if (score < 0.60) return 'medium';
  if (score < 0.80) return 'high';
  return 'critical';
}

export interface UnifiParams {
  mac: string | null;
  apMac: string | null;
  ssid: string | null;
  redirectUrl: string;
}

export interface PortalConfig {
  siteId: string;
  siteName: string;
  portalSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  welcomeMsg: string;
  whatsappSupport: string | null;
  plans: WifiPlan[];
}

export interface WifiPlan {
  id: string;
  name: string;
  durationMin: number;
  priceFcfa: number;
  speedDownMb: number;
  speedUpMb: number;
  dataLimitMb: number | null;
  maxDevices: number;
  isPopular: boolean;
}

export interface WifiUser {
  id: string;
  siteId: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  loyaltyPts: number;
  loyaltyLevel: LoyaltyLevel;
  churnRisk: number;
  churnRiskLevel: ChurnRisk;
  aiSegment: AISegment;
  referralCode: string | null;
  isBlocked: boolean;
}

export interface ActiveSession {
  id: string;
  mac: string;
  ssid: string | null;
  startedAt: string;
  expiresAt: string;
  status: SessionStatus;
  planName: string;
  priceFcfa: number;
}

export interface SiteKPIs {
  activeSessionsNow: number;
  avgSessionDuration: number;
  connectionSuccessRate: number;
  peakConcurrentUsers: number;
  mrr: number;
  arpu: number;
  arppu: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  churnRate: number;
  nps: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
  offersViewed: number;
  offersClicked: number;
  ctr: number;
}

export const LOYALTY_CONFIG: Record<LoyaltyLevel, {
  label: string;
  color: string;
  minPoints: number;
  badge: string;
  bonus: string;
}> = {
  basic:    { label: 'Basic',    color: '#9CA3AF', minPoints: 0,    badge: '⚪', bonus: 'Accès standard' },
  bronze:   { label: 'Bronze',   color: '#CD7F32', minPoints: 100,  badge: '🥉', bonus: '+5% temps bonus' },
  silver:   { label: 'Silver',   color: '#C0C0C0', minPoints: 500,  badge: '🥈', bonus: '+10% temps, quiz premium' },
  gold:     { label: 'Gold',     color: '#FFD700', minPoints: 1500, badge: '🥇', bonus: '+15% temps, vidéos exclusives' },
  platinum: { label: 'Platinum', color: '#E5E4E2', minPoints: 5000, badge: '💎', bonus: '+20% temps, support prioritaire' },
};

export const POINTS_CONFIG = {
  purchase:      10,
  quiz_win:      15,
  memory_win:    10,
  tap_game:       5,
  puzzle_win:    10,
  video_watched: 20,
  referral:      50,
  daily_login:    5,
};

export const DEFAULT_PLANS: Omit<WifiPlan, 'id'>[] = [
  { name: 'Journalier',   durationMin: 1440,  priceFcfa: 300,   speedDownMb: 5,  speedUpMb: 2,  dataLimitMb: null, maxDevices: 1, isPopular: false },
  { name: '3 Jours',      durationMin: 4320,  priceFcfa: 500,   speedDownMb: 5,  speedUpMb: 2,  dataLimitMb: null, maxDevices: 1, isPopular: false },
  { name: 'Hebdomadaire', durationMin: 10080, priceFcfa: 1000,  speedDownMb: 10, speedUpMb: 5,  dataLimitMb: null, maxDevices: 1, isPopular: true  },
  { name: 'Mensuel',      durationMin: 43200, priceFcfa: 3000,  speedDownMb: 10, speedUpMb: 5,  dataLimitMb: null, maxDevices: 1, isPopular: false },
  { name: 'Famille',      durationMin: 43200, priceFcfa: 10000, speedDownMb: 20, speedUpMb: 10, dataLimitMb: null, maxDevices: 5, isPopular: false },
];
