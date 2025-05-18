
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { WifiSession } from "./types";

export const sessionService = {
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
  }
};
