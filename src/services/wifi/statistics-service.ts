
import { supabase } from "@/integrations/supabase/client";
import { PortalStatistic } from "./types";

export const statisticsService = {
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
