
import { GameCategory } from "./types/game-categories";

export enum Step {
  AUTH = "auth",
  ENGAGEMENT = "engagement",
  SUCCESS = "success",
  EXTEND_TIME = "extend-time",
  LEAD_GAME = "lead-game",
  DASHBOARD = "dashboard",
  REWARDS = "rewards",
  REFERRAL = "referral",
  MINI_GAMES = "mini-games",
  ADMIN_STATS = "admin-stats",
  PAYMENT = "payment"
}

export enum EngagementType {
  VIDEO = "video",
  QUIZ = "quiz"
}

export enum UserLevel {
  BASIC = "basic",
  BRONZE = "bronze", // Added BRONZE level
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum"
}

export enum GameType {
  MEMORY = "memory",
  QUIZ = "quiz",
  PUZZLE = "puzzle",
  TAP = "tap"
}

export enum RewardType {
  WIFI_TIME = "wifi_time",
  PREMIUM_ACCESS = "premium_access",
  DISCOUNT = "discount"
}

// Added PaymentMethod enum
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  MOBILE_MONEY = "mobile_money"
}

// Added PaymentPackage interface
export interface PaymentPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  minutes: number;
  isPopular?: boolean;
}

export interface ConnectionRecord {
  date: string;
  duration: number;
  engagementType: string;
}

export interface UserData {
  id?: string;
  authMethod?: string;
  timeRemainingMinutes: number;
  sessionId?: string;
  email?: string;
  phone?: string;
  name?: string;
  macAddress?: string;
  points?: number;
  level?: UserLevel;
  referralCode?: string;
  connectionHistory?: ConnectionRecord[];
  referredUsers?: string[];
  engagementData?: any; 
  leadData?: any;
  isAdmin?: boolean;
}

export interface MiniGameData {
  id: string;
  name: string;
  type: GameType;
  description: string;
  rewardMinutes: number;
  rewardPoints: number;
  category?: GameCategory;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  value: number;
  pointsCost: number;
  imageUrl?: string;
}

export interface StatisticsData {
  totalConnections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
  dailyStats: DailyStatistics[];
  userGrowth: number; // percentage
  averageSessionDuration: number; // minutes
}

export interface DailyStatistics {
  date: string;
  connections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
}
