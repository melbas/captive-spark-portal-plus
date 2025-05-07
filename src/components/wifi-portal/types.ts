
// Define the steps for the WiFi portal flow
export enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS,
  EXTEND_TIME,
  LEAD_GAME,
  DASHBOARD,
  REWARDS,
  REFERRAL,
  MINI_GAMES,
  ADMIN_STATS,
  PAYMENT
}

// Define the engagement types
export enum EngagementType {
  VIDEO,
  QUIZ
}

// Define game types for mini-games
export enum GameType {
  MEMORY = "memory",
  QUIZ = "quiz",
  PUZZLE = "puzzle",
  TAP = "tap"
}

// Define payment methods
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  MOBILE_MONEY = "mobile_money",
  PAYPAL = "paypal"
}

// Define user level types based on points
export enum UserLevel {
  BASIC = "Basic",
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum"
}

// Define the user data structure
export interface UserData {
  id?: string;
  authMethod?: string;
  timeRemainingMinutes?: number;
  engagementData?: any;
  sessionId?: string;
  email?: string;
  phone?: string;
  name?: string;
  macAddress?: string;
  leadData?: any;
  points?: number;
  level?: UserLevel;
  connectionHistory?: ConnectionRecord[];
  referralCode?: string;
  referredUsers?: string[];
  isAdmin?: boolean;
  [key: string]: any;
}

// Define a connection record for history
export interface ConnectionRecord {
  date: string;
  duration: number;
  engagementType?: string;
}

// Define a reward structure
export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: RewardType;
  value: number; // e.g., minutes of WiFi time or discount percentage
}

// Define reward types
export enum RewardType {
  WIFI_TIME = "wifi_time",
  DISCOUNT = "discount",
  PREMIUM_ACCESS = "premium_access"
}

// Define referral data structure
export interface ReferralData {
  code: string;
  referrerId: string;
  rewardMinutes: number;
  usedBy?: string[];
}

// Define mini-game data structure
export interface MiniGameData {
  id: string;
  name: string;
  type: GameType;
  description: string;
  rewardMinutes: number;
  rewardPoints: number;
}

// Define statistics data structure
export interface StatisticsData {
  totalConnections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
  dailyStats: DailyStatistics[];
  userGrowth: number;
  averageSessionDuration: number;
}

// Define daily statistics structure
export interface DailyStatistics {
  date: string;
  connections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
}

// Define payment package structure
export interface PaymentPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  minutes: number;
  isPopular?: boolean;
}
