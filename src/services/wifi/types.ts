
import { Database } from "@/integrations/supabase/types";

export interface WifiUser {
  id?: string;
  auth_method: string;
  email?: string;
  phone?: string;
  name?: string;
  mac_address?: string;
}

export interface WifiSession {
  id?: string;
  user_id: string;
  duration_minutes: number;
  engagement_type?: string;
  engagement_data?: any;
  is_active?: boolean;
}

export interface PortalStatistic {
  total_connections: number;
  video_views: number;
  quiz_completions: number;
  games_played: number;
  leads_collected: number;
}

export interface SMSMessage {
  to: string;
  message: string;
  type?: 'verification' | 'welcome' | 'notification';
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface SMSVerification {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

// Family management types
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

// RADIUS types
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
