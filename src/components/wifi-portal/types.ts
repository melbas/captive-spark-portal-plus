export enum Step {
  AUTH = "auth",
  ENGAGEMENT = "engagement",
  EXTEND_TIME = "extend_time",
  POST_ENGAGEMENT = "post_engagement",
  REDEEM_REWARD = "redeem_reward",
  INVITE = "invite",
  LEAD_GAME = "lead_game",
  PAYMENT = "payment",
  SUCCESS = "success",
  ERROR = "error",
  // Add the missing steps
  DASHBOARD = "dashboard",
  REWARDS = "rewards",
  REFERRAL = "referral",
  MINI_GAMES = "mini_games",
  ADMIN_STATS = "admin_stats",
  FAMILY_MANAGEMENT = "family_management"
}

export enum EngagementType {
  NONE = "none",
  VIDEO = "video",
  QUIZ = "quiz", 
  GAME = "game",
  LEAD_GAME = "lead_game",
  INVITE = "invite"
}

export enum UserLevel {
  BASIC = "basic",
  BRONZE = "bronze",
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

// Import the GameCategory from its module to fix the reference
import { GameCategory } from "./types/game-categories";
export { GameCategory };

export enum RewardType {
  WIFI_TIME = "wifi_time",
  PREMIUM_ACCESS = "premium_access",
  DISCOUNT = "discount",
  VOUCHER = "voucher"
}

export enum PaymentMethod {
  MOBILE_MONEY = "mobile_money",
  CREDIT_CARD = "credit_card",
  BANK_TRANSFER = "bank_transfer"
}

export interface FamilyProfile {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  macAddress?: string;
  joinedAt: string;
  lastActive?: string;
  active: boolean;
  timeUsedMinutes: number;
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
  engagementData?: any;
  leadData?: any;
  points?: number;
  level?: UserLevel;
  referralCode?: string;
  referredUsers?: string[];
  connectionHistory?: ConnectionHistory[];
  isAdmin?: boolean;
  family?: FamilyProfile;
}

export interface ConnectionHistory {
  date: string;
  duration: number;
  engagementType: string;
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

export interface MiniGameData {
  id: string;
  name: string;
  type: GameType;
  description: string;
  rewardMinutes: number;
  rewardPoints: number;
  category?: GameCategory;
}

export interface GameEvent {
  gameId: string;
  gameType: GameType;
  gameCategory?: string;
  score: number;
  timeSpentSeconds: number;
  completionStatus: 'completed' | 'abandoned';
  userId?: string;
}

export interface PaymentPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  minutes: number;
  isPopular?: boolean;
}

export interface StatisticsData {
  totalConnections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
  dailyStats: DailyStatistics[];
  userGrowth: number; // Adding the missing property
  averageSessionDuration: number; // Adding the missing property
}

export interface DailyStatistics {
  date: string;
  connections: number;
  videoViews: number;
  quizCompletions: number;
  gamesPlayed: number;
  leadsCollected: number;
}

export enum UserRole {
  OWNER = "owner",
  MEMBER = "member",
  INDIVIDUAL = "individual"
}

export interface RadiusClient {
  id: string;
  name: string;
  shortname: string;
  nastype: string;
  secret: string;
  ipAddress: string;
  description?: string;
  isActive: boolean;
}

export interface RadiusAuthLog {
  id: string;
  username: string;
  nasipaddress: string;
  nasportid?: string;
  authDate: string;
  authStatus: "accept" | "reject";
  failureReason?: string;
}

export interface RadiusAccountingLog {
  id: string;
  username: string;
  acctSessionId: string;
  acctSessionTime?: number;
  acctInputOctets?: number;
  acctOutputOctets?: number;
  nasipaddress: string;
  startTime: string;
  stopTime?: string;
  terminationCause?: string;
}
