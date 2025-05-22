
import { wifiPortalService } from './wifi-portal-service';
import { GameCategory } from '@/components/wifi-portal/types/game-categories';
import { MiniGameData, GameType } from '@/components/wifi-portal/types';

export interface GameEvent {
  gameId: string;
  gameType: GameType;
  gameCategory: GameCategory;
  score: number;
  timeSpentSeconds: number;
  completionStatus: 'completed' | 'abandoned'; 
  userId?: string;
  timestamp: string;
}

export interface UserSegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
  description: string;
}

// Les segments d'utilisateur prédéfinis
export const USER_SEGMENTS: UserSegment[] = [
  {
    id: 'new_users',
    name: 'Nouveaux utilisateurs',
    criteria: { connectionCount: { lt: 3 } },
    description: 'Utilisateurs avec moins de 3 connexions'
  },
  {
    id: 'frequent_users',
    name: 'Utilisateurs fréquents',
    criteria: { connectionCount: { gt: 5 } },
    description: 'Utilisateurs avec plus de 5 connexions'
  },
  {
    id: 'gamers',
    name: 'Joueurs assidus',
    criteria: { gamesPlayed: { gt: 10 } },
    description: 'Utilisateurs ayant joué à plus de 10 jeux'
  },
  {
    id: 'leads',
    name: 'Prospects',
    criteria: { hasEmail: true },
    description: 'Utilisateurs ayant fourni leur email'
  }
];

class AnalyticsService {
  private gameSessionStartTimes: Record<string, number> = {};

  // Démarre le suivi du temps pour un jeu spécifique
  public startGameSession(gameId: string): void {
    this.gameSessionStartTimes[gameId] = Date.now();
  }

  // Calcule le temps passé sur un jeu
  public getSessionDuration(gameId: string): number {
    const startTime = this.gameSessionStartTimes[gameId];
    if (!startTime) return 0;
    
    const durationMs = Date.now() - startTime;
    // Convertir en secondes
    return Math.round(durationMs / 1000);
  }

  // Enregistre un événement de jeu
  public async trackGameEvent(event: Omit<GameEvent, 'timestamp'>): Promise<boolean> {
    try {
      console.log('Tracking game event:', event);
      
      // Incrémenter les statistiques appropriées
      await wifiPortalService.incrementStatistic('games_played');
      
      // Dans une implémentation réelle, nous enregistrerions cet événement dans une table séparée
      // Pour l'instant, nous nous contentons de logs et d'incrémentation de statistiques
      
      // Supprimer le timestamp de début
      if (this.gameSessionStartTimes[event.gameId]) {
        delete this.gameSessionStartTimes[event.gameId];
      }

      return true;
    } catch (error) {
      console.error('Error tracking game event:', error);
      return false;
    }
  }

  // Segment un utilisateur en fonction de son comportement
  public getUserSegments(userData: any): string[] {
    const segments: string[] = [];
    
    USER_SEGMENTS.forEach(segment => {
      if (this.matchesSegmentCriteria(userData, segment.criteria)) {
        segments.push(segment.id);
      }
    });
    
    return segments;
  }

  private matchesSegmentCriteria(userData: any, criteria: Record<string, any>): boolean {
    for (const [key, conditions] of Object.entries(criteria)) {
      const userValue = this.getNestedProperty(userData, key);
      
      if (typeof conditions === 'object') {
        for (const [operator, value] of Object.entries(conditions)) {
          switch (operator) {
            case 'eq':
              if (userValue !== value) return false;
              break;
            case 'lt':
              if (!(userValue < value)) return false;
              break;
            case 'gt':
              if (!(userValue > value)) return false;
              break;
            case 'in':
              if (!Array.isArray(value) || !value.includes(userValue)) return false;
              break;
            default:
              console.warn(`Unknown operator ${operator}`);
          }
        }
      } else {
        // Simple equality check
        if (userValue !== conditions) return false;
      }
    }
    return true;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : null;
    }, obj);
  }
}

export const analyticsService = new AnalyticsService();
