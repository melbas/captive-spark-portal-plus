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

/**
 * Service for managing family change tracking and limits
 */
export const familyChangeService = {
  /**
   * Check if a user can make changes to their family this month
   */
  async validateFamilyChange(userId: string, changeType: string): Promise<FamilyChangeValidation> {
    try {
      // Reset monthly counter if needed
      await this.resetMonthlyChangesIfNeeded(userId);
      
      // Get current user data
      const { data: userData, error } = await supabase
        .from('wifi_users')
        .select('changes_this_month, last_change_reset')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const maxChanges = 3;
      const changesThisMonth = userData?.changes_this_month || 0;
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
      
      // Update user's change counter
      if (countsTowardLimit) {
        const { error: updateError } = await supabase
          .from('wifi_users')
          .update({ changes_this_month: newCount })
          .eq('id', changeData.userId);
        
        if (updateError) throw updateError;
      }
      
      // Log the change in the audit table
      const { error: logError } = await supabase
        .from('family_member_changes')
        .insert({
          family_id: changeData.familyId,
          user_id: changeData.userId,
          change_type: changeData.changeType,
          old_member_id: changeData.oldMemberId,
          new_member_id: changeData.newMemberId,
          changes_count_after: newCount
        });
      
      if (logError) throw logError;
      
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
      const { data: userData, error } = await supabase
        .from('wifi_users')
        .select('last_change_reset')
        .eq('id', userId)
        .single();
      
      if (error || !userData) return;
      
      const now = new Date();
      const lastReset = new Date(userData.last_change_reset);
      
      // Check if we're in a different month
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        const { error: updateError } = await supabase
          .from('wifi_users')
          .update({ 
            changes_this_month: 0,
            last_change_reset: now.toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error resetting monthly changes:', updateError);
        }
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
      const { data, error } = await supabase
        .from('family_member_changes')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting family change history:', error);
      return [];
    }
  }
};
