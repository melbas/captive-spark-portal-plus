
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

// Nouvelles interfaces pour la gestion de famille
export interface FamilyProfile {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  member_count: number;
  max_members: number;
  created_at: string;
  expires_at: string;
  active: boolean;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: 'owner' | 'member' | 'child';
  active: boolean;
  added_at: string;
  last_connection?: string;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  email?: string;
  phone?: string;
  name?: string;
  role: 'member' | 'child';
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  token: string;
}

export interface FamilyActivityLog {
  id: string;
  family_id: string;
  user_id?: string;
  user_name?: string;
  action: 'login' | 'logout' | 'join' | 'leave' | 'add_member' | 'remove_member' | 'suspend_member' | 'reactivate_member' | 'payment';
  details?: any;
  timestamp: string;
}
