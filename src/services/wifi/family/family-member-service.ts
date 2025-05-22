
import { supabase } from "@/integrations/supabase/client";
import { FamilyMember, FamilyProfile } from "../types";
import { FamilyRole } from "@/components/wifi-portal/types";
import { familyProfileService } from "./family-profile-service";
import { familyActivityService } from "./family-activity-service";

// Mock data for development
const mockFamilyMembers: FamilyMember[] = [
  {
    id: "mem-111111",
    family_id: "fam-123456",
    user_id: "usr-123456",
    name: "Amadou Diop",
    email: "amadou.diop@example.com",
    phone: "+221771234567",
    role: "owner",
    active: true,
    added_at: new Date().toISOString()
  },
  {
    id: "mem-222222",
    family_id: "fam-123456",
    user_id: "usr-234567",
    name: "Fatou Diop",
    email: "fatou.diop@example.com",
    phone: "+221772345678",
    role: "member",
    active: true,
    added_at: new Date().toISOString(),
    last_connection: new Date().toISOString()
  },
  {
    id: "mem-333333",
    family_id: "fam-123456",
    user_id: "usr-345678",
    name: "Omar Diop",
    email: null,
    phone: "+221773456789",
    role: "child",
    active: true,
    added_at: new Date().toISOString(),
    last_connection: new Date(Date.now() - 86400000).toISOString()
  }
];

/**
 * Service for managing family members
 */
export const familyMemberService = {
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
    userData: { id: string; name?: string; email?: string; phone?: string }, 
    role: FamilyRole = FamilyRole.MEMBER
  ): Promise<FamilyMember | null> {
    try {
      // Check if the family exists and has space
      const family = await familyProfileService.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      if (family.member_count >= family.max_members) throw new Error("Family is at maximum capacity");
      
      // Check if the user isn't already a member
      const existingMember = mockFamilyMembers.find(m => m.family_id === familyId && m.user_id === userData.id);
      if (existingMember) throw new Error("User is already a member of this family");
      
      const memberId = `mem-${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      
      // Map FamilyRole enum to string role for database
      const dbRole = role === FamilyRole.OWNER ? "owner" : role === FamilyRole.MEMBER ? "member" : "child";
      
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
  },
  
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
      
      // Convert string role to enum
      if (member.role === 'owner') return FamilyRole.OWNER;
      if (member.role === 'member') return FamilyRole.MEMBER;
      if (member.role === 'child') return FamilyRole.CHILD;
      
      return null;
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
