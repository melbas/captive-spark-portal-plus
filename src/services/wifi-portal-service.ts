
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
    try {
      // If no ID provided, generate one
      if (!userData.id) {
        userData.id = uuidv4();
      }
      
      const { data, error } = await supabase
        .from('wifi_users')
        .insert(userData)
        .select()
        .single();
      
      if (error) {
        console.error("Error creating user:", error);
        throw error; // Throw error for better handling in UI
      }
      
      await this.incrementStatistic('total_connections');
      return data;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error; // Re-throw to handle in the component
    }
  },
  
  async getUserByMac(macAddress: string): Promise<WifiUser | null> {
    try {
      const { data, error } = await supabase
        .from('wifi_users')
        .select()
        .eq('mac_address', macAddress)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user by MAC:", error);
        return null;
      }
      
      if (data) {
        // Update the last_connection timestamp whenever we retrieve a user by MAC
        await this.updateUser(data.id, { last_connection: new Date().toISOString() });
      }
      
      return data;
    } catch (error) {
      console.error("Failed to get user by MAC:", error);
      return null;
    }
  },
  
  async updateUser(userId: string, updateData: Partial<WifiUser>): Promise<WifiUser | null> {
    try {
      const { data, error } = await supabase
        .from('wifi_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating user:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Failed to update user:", error);
      return null;
    }
  },
  
  // Session operations
  async createSession(sessionData: WifiSession): Promise<WifiSession | null> {
    try {
      // If no ID provided, generate one
      if (!sessionData.id) {
        sessionData.id = uuidv4();
      }

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
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  },
  
  async updateSession(sessionId: string, updateData: Partial<WifiSession>): Promise<WifiSession | null> {
    try {
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
    } catch (error) {
      console.error("Failed to update session:", error);
      return null;
    }
  },
  
  async deactivateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wifi_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error deactivating session:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to deactivate session:", error);
      return false;
    }
  },
  
  // Statistics operations
  async incrementStatistic(field: keyof PortalStatistic): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error(`Failed to increment statistic ${field}:`, error);
      return false;
    }
  }
};
