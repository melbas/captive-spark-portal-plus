
import { FamilyMember } from "../../types";
import { FamilyRole } from "@/components/wifi-portal/types";
import { mockFamilyMembers } from "../data/mock-family-members";
import { mapRoleToDbRole, generateMemberId, validateMemberAddition } from "../utils/family-member-utils";
import { familyProfileService } from "../family-profile-service";
import { familyActivityService } from "../family-activity-service";
import { familyChangeService } from "../family-change-service";
import { AddMemberData } from "../types/family-member-types";

/**
 * Operations for managing family members
 */
export const memberOperations = {
  /**
   * Get all members of a family
   */
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .select('*')
      //   .eq('family_id', familyId);
      // if (error) throw error;
      // return data;
      
      // For development:
      return mockFamilyMembers.filter(m => m.family_id === familyId);
    } catch (error) {
      console.error(`Failed to get members for family ${familyId}:`, error);
      return [];
    }
  },

  /**
   * Add a new member to a family
   */
  async addFamilyMember(
    familyId: string, 
    userData: AddMemberData, 
    role: FamilyRole = FamilyRole.MEMBER
  ): Promise<FamilyMember | null> {
    try {
      // Validate change limits
      const validation = await familyChangeService.validateFamilyChange(userData.id, 'add');
      if (!validation.canChange) {
        throw new Error(validation.errorMessage);
      }
      
      // Check if the family exists and has space
      const family = await familyProfileService.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      
      // Validate member addition
      const memberValidation = validateMemberAddition(mockFamilyMembers, familyId, userData.id, family.max_members);
      if (!memberValidation.valid) throw new Error(memberValidation.error);
      
      const memberId = generateMemberId();
      const now = new Date().toISOString();
      const dbRole = mapRoleToDbRole(role);
      
      const newMember: FamilyMember = {
        id: memberId,
        family_id: familyId,
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: dbRole,
        active: true,
        added_at: now
      };
      
      // In production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .insert(newMember)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // For development:
      mockFamilyMembers.push(newMember);
      
      // Log the change
      await familyChangeService.logFamilyChange({
        familyId,
        userId: userData.id,
        changeType: 'add',
        newMemberId: memberId
      });
      
      // Update member count
      await familyProfileService.updateFamilyProfile(familyId, {
        member_count: family.member_count + 1
      });
      
      // Log activity
      await familyActivityService.logFamilyActivity(
        familyId, 
        userData.id, 
        userData.name, 
        'join', 
        { role }
      );
      
      return newMember;
    } catch (error) {
      console.error(`Failed to add member to family ${familyId}:`, error);
      return null;
    }
  },

  /**
   * Toggle a member's active status (suspend/reactivate)
   */
  async toggleMemberStatus(memberId: string, active: boolean): Promise<FamilyMember | null> {
    try {
      // Find the member first
      const memberIndex = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return null;
      
      const member = mockFamilyMembers[memberIndex];
      
      // Validate change (suspension/reactivation doesn't count toward monthly limit)
      const changeType = active ? 'reactivate' : 'suspend';
      const validation = await familyChangeService.validateFamilyChange(member.user_id, changeType);
      
      if (!validation.canChange && changeType === 'reactivate') {
        // Check if there are available slots for reactivation
        const activeMembers = mockFamilyMembers.filter(m => 
          m.family_id === member.family_id && m.active
        ).length;
        
        if (activeMembers >= 5) {
          throw new Error("Impossible de réactiver: limite de 5 membres actifs atteinte");
        }
      }
      
      // In production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .update({ active })
      //   .eq('id', memberId)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // For development:
      mockFamilyMembers[memberIndex] = { ...mockFamilyMembers[memberIndex], active };
      
      // Log the change (doesn't count toward monthly limit)
      await familyChangeService.logFamilyChange({
        familyId: member.family_id,
        userId: member.user_id,
        changeType,
        oldMemberId: memberId
      });
      
      // Log activity
      await familyActivityService.logFamilyActivity(
        member.family_id,
        member.user_id,
        member.name,
        changeType === 'reactivate' ? 'reactivate_member' : 'suspend_member',
        { memberId }
      );
      
      return mockFamilyMembers[memberIndex];
    } catch (error) {
      console.error(`Failed to toggle status for member ${memberId}:`, error);
      return null;
    }
  },

  /**
   * Remove a member from a family
   */
  async removeFamilyMember(memberId: string): Promise<boolean> {
    try {
      // Find the member
      const memberIndex = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return false;
      
      const member = mockFamilyMembers[memberIndex];
      const familyId = member.family_id;
      
      // Don't remove the owner
      if (member.role === 'owner') {
        throw new Error("Cannot remove the family owner");
      }
      
      // Validate change limits
      const validation = await familyChangeService.validateFamilyChange(member.user_id, 'remove');
      if (!validation.canChange) {
        throw new Error(validation.errorMessage);
      }
      
      // Get the family
      const family = await familyProfileService.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      
      // Log the change
      await familyChangeService.logFamilyChange({
        familyId,
        userId: member.user_id,
        changeType: 'remove',
        oldMemberId: memberId
      });
      
      // Log activity
      await familyActivityService.logFamilyActivity(
        familyId, 
        member.user_id, 
        member.name, 
        'remove_member',
        { memberId, role: member.role }
      );
      
      // Remove the member
      mockFamilyMembers.splice(memberIndex, 1);
      
      // Update member count
      await familyProfileService.updateFamilyProfile(familyId, {
        member_count: Math.max(1, family.member_count - 1)
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to remove member ${memberId}:`, error);
      return false;
    }
  }
};
