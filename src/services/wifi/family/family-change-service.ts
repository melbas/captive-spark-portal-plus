import { supabase } from "@/integrations/supabase/client";

export interface FamilyChangeData {
  familyId: string;
  userId: string;
  changeType: 'add' | 'remove' | 'replace' | 'suspend' | 'reactivate';
  oldMemberId?: string;
  newMemberId?: string;
}

export interface FamilyChangeValidation {
  canChange: boolean;
  remainingChanges: number;
  changesThisMonth: number;
  maxChanges: number;
  errorMessage?: string;
}

// Mock storage for family changes (in production this would be in database)
const familyChangesStorage = new Map<string, {
  changesThisMonth: number;
  lastChangeReset: string;
  changeHistory: Array<{
    changeType: string;
    timestamp: string;
    userId: string;
    familyId: string;
  }>;
}>();

/**
 * Service for managing family change tracking and limits
 * Currently using mock data - will be updated to use database when schema is ready
 */
export const familyChangeService = {
  /**
   * Check if a user can make changes to their family this month
   */
  async validateFamilyChange(userId: string, changeType: string): Promise<FamilyChangeValidation> {
    try {
      // Reset monthly counter if needed
      await this.resetMonthlyChangesIfNeeded(userId);
      
      // Get current user data from mock storage
      const userData = familyChangesStorage.get(userId) || {
        changesThisMonth: 0,
        lastChangeReset: new Date().toISOString(),
        changeHistory: []
      };
      
      const maxChanges = 3;
      const changesThisMonth = userData.changesThisMonth || 0;
      const remainingChanges = maxChanges - changesThisMonth;
      
      // Suspension and reactivation don't count as changes
      if (changeType === 'suspend' || changeType === 'reactivate') {
        return {
          canChange: true,
          remainingChanges,
          changesThisMonth,
          maxChanges
        };
      }
      
      // Other changes (add, remove, replace) count toward monthly limit
      const canChange = changesThisMonth < maxChanges;
      
      return {
        canChange,
        remainingChanges,
        changesThisMonth,
        maxChanges,
        errorMessage: canChange ? undefined : `Limite atteinte: ${changesThisMonth}/${maxChanges} changements ce mois`
      };
    } catch (error) {
      console.error('Error validating family change:', error);
      return {
        canChange: false,
        remainingChanges: 0,
        changesThisMonth: 0,
        maxChanges: 3,
        errorMessage: 'Erreur lors de la validation des changements'
      };
    }
  },

  /**
   * Log a family change and update the counter
   */
  async logFamilyChange(changeData: FamilyChangeData): Promise<boolean> {
    try {
      const validation = await this.validateFamilyChange(changeData.userId, changeData.changeType);
      
      if (!validation.canChange) {
        throw new Error(validation.errorMessage);
      }
      
      // Increment counter for changes that count toward monthly limit
      const countsTowardLimit = ['add', 'remove', 'replace'].includes(changeData.changeType);
      const newCount = countsTowardLimit ? validation.changesThisMonth + 1 : validation.changesThisMonth;
      
      // Update mock storage
      const userData = familyChangesStorage.get(changeData.userId) || {
        changesThisMonth: 0,
        lastChangeReset: new Date().toISOString(),
        changeHistory: []
      };
      
      userData.changesThisMonth = newCount;
      userData.changeHistory.push({
        changeType: changeData.changeType,
        timestamp: new Date().toISOString(),
        userId: changeData.userId,
        familyId: changeData.familyId
      });
      
      familyChangesStorage.set(changeData.userId, userData);
      
      console.log(`Family change logged: ${changeData.changeType} for user ${changeData.userId}, new count: ${newCount}`);
      
      return true;
    } catch (error) {
      console.error('Error logging family change:', error);
      return false;
    }
  },

  /**
   * Reset monthly changes counter if we're in a new month
   */
  async resetMonthlyChangesIfNeeded(userId: string): Promise<void> {
    try {
      const userData = familyChangesStorage.get(userId);
      if (!userData) return;
      
      const now = new Date();
      const lastReset = new Date(userData.lastChangeReset);
      
      // Check if we're in a different month
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        userData.changesThisMonth = 0;
        userData.lastChangeReset = now.toISOString();
        familyChangesStorage.set(userId, userData);
        
        console.log(`Monthly changes reset for user ${userId}`);
      }
    } catch (error) {
      console.error('Error checking monthly reset:', error);
    }
  },

  /**
   * Get family change history
   */
  async getFamilyChangeHistory(familyId: string): Promise<any[]> {
    try {
      const allChanges: any[] = [];
      
      // Collect changes from all users in the family
      for (const [userId, userData] of familyChangesStorage.entries()) {
        const familyChanges = userData.changeHistory.filter(change => change.familyId === familyId);
        allChanges.push(...familyChanges.map(change => ({
          ...change,
          id: `${userId}-${change.timestamp}`,
          user_id: userId,
          family_id: familyId,
          change_type: change.changeType,
          created_at: change.timestamp
        })));
      }
      
      return allChanges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error getting family change history:', error);
      return [];
    }
  },

  /**
   * Get current user's monthly change stats
   */
  async getUserChangeStats(userId: string): Promise<{ changesThisMonth: number; maxChanges: number; remainingChanges: number }> {
    await this.resetMonthlyChangesIfNeeded(userId);
    
    const userData = familyChangesStorage.get(userId) || {
      changesThisMonth: 0,
      lastChangeReset: new Date().toISOString(),
      changeHistory: []
    };
    
    const maxChanges = 3;
    const changesThisMonth = userData.changesThisMonth;
    const remainingChanges = maxChanges - changesThisMonth;
    
    return { changesThisMonth, maxChanges, remainingChanges };
  }
};
