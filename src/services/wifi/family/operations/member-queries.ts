
import { FamilyProfile } from "../../types";
import { FamilyRole } from "@/components/wifi-portal/types";
import { mockFamilyMembers } from "../data/mock-family-members";
import { mapDbRoleToRole } from "../utils/family-member-utils";
import { familyProfileService } from "../family-profile-service";

/**
 * Query operations for family members
 */
export const memberQueries = {
  /**
   * Get a user's role in a family
   */
  async getUserFamilyRole(userId: string, familyId?: string): Promise<FamilyRole | null> {
    try {
      let member;
      
      if (familyId) {
        // If family ID is provided, find specific member
        // In production:
        // const { data, error } = await supabase
        //   .from('family_members')
        //   .select('*')
        //   .eq('family_id', familyId)
        //   .eq('user_id', userId)
        //   .single();
        // if (error) throw error;
        // member = data;
        
        // For development:
        member = mockFamilyMembers.find(m => m.family_id === familyId && m.user_id === userId);
      } else {
        // Find first family role for user
        // In production:
        // const { data, error } = await supabase
        //   .from('family_members')
        //   .select('*')
        //   .eq('user_id', userId)
        //   .limit(1)
        //   .single();
        // if (error) throw error;
        // member = data;
        
        // For development:
        member = mockFamilyMembers.find(m => m.user_id === userId);
      }
      
      if (!member) return null;
      
      return mapDbRoleToRole(member.role);
    } catch (error) {
      console.error(`Failed to get role for user ${userId}:`, error);
      return null;
    }
  },

  /**
   * Get a user's family
   */
  async getUserFamily(userId: string): Promise<FamilyProfile | null> {
    try {
      // In production:
      // const { data: memberData, error: memberError } = await supabase
      //   .from('family_members')
      //   .select('family_id')
      //   .eq('user_id', userId)
      //   .single();
      // if (memberError) throw memberError;
      // 
      // const { data: familyData, error: familyError } = await supabase
      //   .from('family_profiles')
      //   .select('*')
      //   .eq('id', memberData.family_id)
      //   .single();
      // if (familyError) throw familyError;
      // return familyData;
      
      // For development:
      const member = mockFamilyMembers.find(m => m.user_id === userId);
      if (!member) return null;
      
      return await familyProfileService.getFamilyProfile(member.family_id);
    } catch (error) {
      console.error(`Failed to get family for user with id ${userId}:`, error);
      return null;
    }
  }
};
