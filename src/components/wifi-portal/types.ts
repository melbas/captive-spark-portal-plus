
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
  PAYMENT = "payment",
  FAMILY_MANAGEMENT = "family-management" // Ajout d'une nouvelle étape pour la gestion familiale
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

// Role utilisateur pour les profils familiaux
export enum UserRole {
  OWNER = "owner",           // Responsable du profil familial
  MEMBER = "member",         // Membre d'un profil familial
  INDIVIDUAL = "individual"  // Utilisateur individuel
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
  // Nouveaux champs pour les profils familiaux
  role?: UserRole;
  familyId?: string;
  familyName?: string;
  familyOwnerId?: string;
}

// Interface pour les profils familiaux
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

// Interface pour les membres d'un profil familial
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

// Interface pour les clients RADIUS
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

// Interface pour les journaux d'authentification RADIUS
export interface RadiusAuthLog {
  id: string;
  username: string;
  nasipaddress: string;
  nasportid?: string;
  authDate: string;
  authStatus: "accept" | "reject";
  failureReason?: string;
}

// Interface pour les journaux de comptabilité RADIUS
export interface RadiusAccountingLog {
  id: string;
  username: string;
  acctSessionId: string;
  acctSessionTime: number;
  acctInputOctets: number;
  acctOutputOctets: number;
  nasipaddress: string;
  startTime: string;
  stopTime?: string;
  terminationCause?: string;
}
