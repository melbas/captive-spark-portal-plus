
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
