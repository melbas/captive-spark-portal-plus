
// Define the steps for the WiFi portal flow
export enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS,
  EXTEND_TIME,
  LEAD_GAME,
  DASHBOARD,
  REWARDS,
  REFERRAL
}

// Define the engagement types
export enum EngagementType {
  VIDEO,
  QUIZ
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
