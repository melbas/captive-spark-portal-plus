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
  ERROR = "error"
}

export type EngagementType =
  | "none"
  | "video"
  | "quiz"
  | "game"
  | "lead_game"
  | "invite";

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
