
import { supabase } from "@/integrations/supabase/client";
import { PortalStatistic } from "./types";
import { GameCategory } from "@/components/wifi-portal/types/game-categories";
import { GameType } from "../wifi/types";

export interface GameStatistic {
  game_id: string;
  game_type: GameType;
  game_category: GameCategory;
  sessions_count: number;
  average_score: number;
  average_duration_seconds: number;
  completion_rate: number;
}

export const statisticsService = {
  // Méthode existante
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
  },

  // Nouvelle méthode pour récupérer les statistiques par période
  async getStatisticsByDateRange(startDate: string, endDate: string): Promise<PortalStatistic[]> {
    try {
      const { data, error } = await supabase
        .from('portal_statistics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) {
        console.error("Error fetching date range statistics:", error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error("Failed to fetch statistics by date range:", error);
      return [];
    }
  },

  // Méthode simulée pour obtenir des statistiques de jeu (dans une implémentation réelle, ces données seraient stockées dans une table)
  async getGameStatistics(category?: GameCategory): Promise<GameStatistic[]> {
    // Simulation de données pour la démonstration
    // Dans une implémentation réelle, nous ferions une requête à la base de données
    const mockStats: GameStatistic[] = [
      {
        game_id: "memory-game",
        game_type: GameType.MEMORY,
        game_category: GameCategory.COGNITIVE,
        sessions_count: 145,
        average_score: 78,
        average_duration_seconds: 120,
        completion_rate: 0.85
      },
      {
        game_id: "quiz-game",
        game_type: GameType.QUIZ,
        game_category: GameCategory.EDUCATIONAL,
        sessions_count: 210,
        average_score: 65,
        average_duration_seconds: 180,
        completion_rate: 0.92
      },
      {
        game_id: "puzzle-game",
        game_type: GameType.PUZZLE,
        game_category: GameCategory.COGNITIVE,
        sessions_count: 95,
        average_score: 72,
        average_duration_seconds: 240,
        completion_rate: 0.78
      },
      {
        game_id: "tap-game",
        game_type: GameType.TAP,
        game_category: GameCategory.CHALLENGE,
        sessions_count: 320,
        average_score: 88,
        average_duration_seconds: 60,
        completion_rate: 0.95
      }
    ];

    if (category) {
      return mockStats.filter(stat => stat.game_category === category);
    }
    
    return mockStats;
  },

  // Méthode simulée pour obtenir des statistiques par segment utilisateur
  async getUserSegmentStatistics(): Promise<Record<string, any>[]> {
    // Simulation de données pour la démonstration
    return [
      {
        segment_id: "new_users",
        users_count: 250,
        average_session_duration: 15,
        conversion_rate: 0.45,
        average_games_played: 2.3
      },
      {
        segment_id: "frequent_users",
        users_count: 120,
        average_session_duration: 35,
        conversion_rate: 0.75,
        average_games_played: 8.5
      },
      {
        segment_id: "gamers",
        users_count: 85,
        average_session_duration: 42,
        conversion_rate: 0.82,
        average_games_played: 12.7
      },
      {
        segment_id: "leads",
        users_count: 175,
        average_session_duration: 28,
        conversion_rate: 0.65,
        average_games_played: 5.2
      }
    ];
  }
};
