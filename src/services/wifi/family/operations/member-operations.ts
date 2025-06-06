
import { FamilyMember } from "../../types";
import { FamilyRole } from "@/components/wifi-portal/types";
import { mockFamilyMembers } from "../data/mock-family-members";
import { mapRoleToDbRole, generateMemberId, validateMemberAddition } from "../utils/family-member-utils";
import { familyProfileService } from "../family-profile-service";
import { familyActivityService } from "../family-activity-service";
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
      // Check if the family exists and has space
      const family = await familyProfileService.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      
      // Validate member addition
      const validation = validateMemberAddition(mockFamilyMembers, familyId, userData.id, family.max_members);
      if (!validation.valid) throw new Error(validation.error);
      
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
   * Toggle a member's active status
   */
  async toggleMemberStatus(memberId: string, active: boolean): Promise<FamilyMember | null> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .update({ active })
      //   .eq('id', memberId)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // For development:
      const index = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (index === -1) return null;
      
      mockFamilyMembers[index] = { ...mockFamilyMembers[index], active };
      
      // Log activity
      const member = mockFamilyMembers[index];
      await familyActivityService.logFamilyActivity(
        member.family_id,
        member.user_id,
        member.name,
        active ? 'reactivate_member' : 'suspend_member',
        { memberId }
      );
      
      return mockFamilyMembers[index];
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
      // For development:
      const memberIndex = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return false;
      
      const member = mockFamilyMembers[memberIndex];
      const familyId = member.family_id;
      
      // Don't remove the owner
      if (member.role === 'owner') {
        throw new Error("Cannot remove the family owner");
      }
      
      // Get the family
      const family = await familyProfileService.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      
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
