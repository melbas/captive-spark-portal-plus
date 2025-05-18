
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { WifiUser } from "./types";
import { smsService } from "./sms-service";
import { statisticsService } from "./statistics-service";

export const userService = {
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
      
      // Send welcome SMS if phone number is provided
      if (userData.phone && userData.auth_method === 'sms') {
        await smsService.sendSMS({
          to: userData.phone,
          message: "Bienvenue sur notre réseau WiFi ! Vous êtes maintenant connecté.",
          type: 'welcome'
        });
      }
      
      await statisticsService.incrementStatistic('total_connections');
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
  }
};
