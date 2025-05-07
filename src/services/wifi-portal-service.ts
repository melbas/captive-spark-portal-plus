
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

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

export const wifiPortalService = {
  // User operations
  async createUser(userData: WifiUser): Promise<WifiUser | null> {
    const { data, error } = await supabase
      .from('wifi_users')
      .insert(userData)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating user:", error);
      return null;
    }
    
    await this.incrementStatistic('total_connections');
    return data;
  },
  
  async getUserByMac(macAddress: string): Promise<WifiUser | null> {
    const { data, error } = await supabase
      .from('wifi_users')
      .select()
      .eq('mac_address', macAddress)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching user by MAC:", error);
      return null;
    }
    
    return data;
  },
  
  // Session operations
  async createSession(sessionData: WifiSession): Promise<WifiSession | null> {
    const { data, error } = await supabase
      .from('wifi_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating session:", error);
      return null;
    }
    
    return data;
  },
  
  async updateSession(sessionId: string, updateData: Partial<WifiSession>): Promise<WifiSession | null> {
    const { data, error } = await supabase
      .from('wifi_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating session:", error);
      return null;
    }
    
    return data;
  },
  
  async deactivateSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('wifi_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    
    if (error) {
      console.error("Error deactivating session:", error);
      return false;
    }
    
    return true;
  },
  
  // Statistics operations
  async incrementStatistic(field: keyof PortalStatistic): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get today's record
    const { data: existingRecord } = await supabase
      .from('portal_statistics')
      .select()
      .eq('date', today)
      .maybeSingle();
    
    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('portal_statistics')
        .update({ [field]: existingRecord[field] + 1 })
        .eq('id', existingRecord.id);
      
      if (error) {
        console.error(`Error incrementing ${field}:`, error);
        return false;
      }
      
      return true;
    } else {
      // Create new record for today with incremented field
      const newRecord: Record<string, any> = {
        date: today,
        total_connections: 0,
        video_views: 0,
        quiz_completions: 0,
        games_played: 0,
        leads_collected: 0
      };
      
      newRecord[field] = 1;
      
      const { error } = await supabase
        .from('portal_statistics')
        .insert(newRecord);
      
      if (error) {
        console.error(`Error creating statistic record for ${field}:`, error);
        return false;
      }
      
      return true;
    }
  }
};
