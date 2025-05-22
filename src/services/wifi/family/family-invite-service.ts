
import { supabase } from "@/integrations/supabase/client";
import { FamilyInvite } from "../types";
import { FamilyRole } from "@/components/wifi-portal/types";

// Mock data for development
const mockFamilyInvites: FamilyInvite[] = [];

/**
 * Service for managing family invites
 */
export const familyInviteService = {
  /**
   * Create a new family invite
   */
  async createFamilyInvite(
    familyId: string, 
    contactInfo: { email?: string; phone?: string; name?: string }, 
    role: FamilyRole = FamilyRole.MEMBER
  ): Promise<FamilyInvite | null> {
    try {
      const inviteId = `inv-${Math.random().toString(36).substring(2, 8)}`;
      const token = Math.random().toString(36).substring(2, 15);
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires after 7 days
      
      // Map FamilyRole enum to string role for database
      const dbRole = role === FamilyRole.MEMBER ? "member" : "child";
      
      const newInvite: FamilyInvite = {
        id: inviteId,
        family_id: familyId,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name: contactInfo.name,
        role: dbRole as 'member' | 'child',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        token: token
      };
      
      // In production:
      // const { data, error } = await supabase
      //   .from('family_invites')
      //   .insert(newInvite)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // For development:
      mockFamilyInvites.push(newInvite);
      
      // TODO: Send an email or SMS with the invitation link
      // containing the token
      
      return newInvite;
    } catch (error) {
      console.error(`Failed to create family invite:`, error);
      return null;
    }
  },
  
  /**
   * Get pending invites for a family
   */
  async getPendingInvites(familyId: string): Promise<FamilyInvite[]> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_invites')
      //   .select('*')
      //   .eq('family_id', familyId)
      //   .eq('status', 'pending');
      // if (error) throw error;
      // return data;
      
      // For development:
      return mockFamilyInvites
        .filter(invite => invite.family_id === familyId && invite.status === 'pending');
    } catch (error) {
      console.error(`Failed to get pending invites for family ${familyId}:`, error);
      return [];
    }
  }
};
