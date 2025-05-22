
import { MiniGameData, GameType, GameEvent } from '@/components/wifi-portal/types';

interface SessionData {
  startTime: number;
  duration?: number;
}

// Simple in-memory analytics store for demo purposes
const sessions: Record<string, SessionData> = {};
const gameEvents: GameEvent[] = [];

// Analytics service
export const analyticsService = {
  // Start tracking a game session
  startGameSession: (gameId: string) => {
    console.log(`Starting session tracking for game: ${gameId}`);
    sessions[gameId] = {
      startTime: Date.now()
    };
  },

  // End tracking a game session
  endGameSession: (gameId: string) => {
    console.log(`Ending session tracking for game: ${gameId}`);
    const session = sessions[gameId];
    if (session) {
      session.duration = Date.now() - session.startTime;
      return session.duration;
    }
    return 0;
  },
  
  // Get the duration of a session in seconds
  getSessionDuration: (gameId: string): number => {
    const session = sessions[gameId];
    if (!session) return 0;
    
    if (session.duration) {
      return Math.round(session.duration / 1000);
    }
    
    // Session is still active, calculate current duration
    return Math.round((Date.now() - session.startTime) / 1000);
  },

  // Track a game event
  trackGameEvent: (event: GameEvent) => {
    console.log('Tracking game event:', event);
    gameEvents.push({...event, timeSpentSeconds: event.timeSpentSeconds || 0});
    
    // In a real implementation, we would send this to a database or analytics service
  },
  
  // Get game events (for reporting)
  getGameEvents: () => {
    return [...gameEvents];
  },
  
  // Get aggregated game stats
  getGameStats: () => {
    const stats = {
      totalGamesPlayed: gameEvents.length,
      completedGames: gameEvents.filter(e => e.completionStatus === 'completed').length,
      abandonedGames: gameEvents.filter(e => e.completionStatus === 'abandoned').length,
      averageScore: 0,
      averageTimeSeconds: 0
    };
    
    if (stats.totalGamesPlayed > 0) {
      const totalScore = gameEvents.reduce((sum, event) => sum + event.score, 0);
      const totalTime = gameEvents.reduce((sum, event) => sum + event.timeSpentSeconds, 0);
      
      stats.averageScore = Math.round(totalScore / stats.totalGamesPlayed);
      stats.averageTimeSeconds = Math.round(totalTime / stats.totalGamesPlayed);
    }
    
    return stats;
  }
};
