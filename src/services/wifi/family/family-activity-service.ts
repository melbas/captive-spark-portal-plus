
import { supabase } from "@/integrations/supabase/client";
import { FamilyActivityLog } from "../types";

// Mock data for development
const mockActivityLogs: FamilyActivityLog[] = [];

/**
 * Service for managing family activity logs
 */
export const familyActivityService = {
  /**
   * Log a family activity
   */
  async logFamilyActivity(
    familyId: string, 
    userId?: string, 
    userName?: string, 
    action?: string, 
    details?: any
  ): Promise<void> {
    try {
      const logId = `log-${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      
      const logEntry: FamilyActivityLog = {
        id: logId,
        family_id: familyId,
        user_id: userId,
        user_name: userName,
        action: action as any,
        details: details || {},
        timestamp: now
      };
      
      // In production:
      // const { error } = await supabase
      //   .from('family_activity_logs')
      //   .insert(logEntry);
      // if (error) throw error;
      
      // For development:
      mockActivityLogs.push(logEntry);
    } catch (error) {
      console.error(`Failed to log family activity:`, error);
    }
  },
  
  /**
   * Get activity logs for a family
   */
  async getFamilyActivityLogs(familyId: string): Promise<FamilyActivityLog[]> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_activity_logs')
      //   .select('*')
      //   .eq('family_id', familyId)
      //   .order('timestamp', { ascending: false });
      // if (error) throw error;
      // return data;
      
      // For development:
      return mockActivityLogs
        .filter(log => log.family_id === familyId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error(`Failed to get activity logs for family ${familyId}:`, error);
      return [];
    }
  }
};
