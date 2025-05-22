
import { supabase } from "@/integrations/supabase/client";
import { FamilyProfile } from "../types";

// Mock data for development
const mockFamilyProfiles: FamilyProfile[] = [
  {
    id: "fam-123456",
    name: "Famille Diop",
    owner_id: "usr-123456",
    owner_name: "Amadou Diop",
    owner_email: "amadou.diop@example.com",
    owner_phone: "+221771234567",
    member_count: 3,
    max_members: 5,
    created_at: new Date().toISOString(),
    expires_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    active: true
  }
];

/**
 * Service for managing family profiles
 */
export const familyProfileService = {
  /**
   * Get all family profiles
   */
  async getFamilyProfiles(): Promise<FamilyProfile[]> {
    try {
      // In production, we would make a request to Supabase
      // const { data, error } = await supabase.from('family_profiles').select('*');
      // if (error) throw error;
      // return data;
      
      // For development, return simulated data
      return mockFamilyProfiles;
    } catch (error) {
      console.error("Failed to get family profiles:", error);
      return [];
    }
  },
  
  /**
   * Get a specific family profile by ID
   */
  async getFamilyProfile(id: string): Promise<FamilyProfile | null> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_profiles')
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      // if (error) throw error;
      // return data;
      
      // For development:
      const profile = mockFamilyProfiles.find(p => p.id === id);
      return profile || null;
    } catch (error) {
      console.error(`Failed to get family profile with id ${id}:`, error);
      return null;
    }
  },
  
  /**
   * Create a new family profile
   */
  async createFamilyProfile(
    name: string, 
    ownerId: string, 
    ownerName?: string, 
    ownerEmail?: string, 
    ownerPhone?: string
  ): Promise<FamilyProfile | null> {
    try {
      const familyId = `fam-${Math.random().toString(36).substring(2, 8)}`;
      const memberCount = 1; // Initial owner
      const maxMembers = 5; // Maximum 5 members
      
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Expires after 1 month
      
      const newFamily: FamilyProfile = {
        id: familyId,
        name,
        owner_id: ownerId,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_phone: ownerPhone,
        member_count: memberCount,
        max_members: maxMembers,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        active: true
      };
      
      // In production:
      // const { data: familyData, error: familyError } = await supabase
      //   .from('family_profiles')
      //   .insert(newFamily)
      //   .select()
      //   .single();
      // if (familyError) throw familyError;
      
      // For development:
      mockFamilyProfiles.push(newFamily);
      
      return newFamily;
    } catch (error) {
      console.error("Failed to create family profile:", error);
      return null;
    }
  },
  
  /**
   * Update an existing family profile
   */
  async updateFamilyProfile(id: string, updates: Partial<FamilyProfile>): Promise<FamilyProfile | null> {
    try {
      // In production:
      // const { data, error } = await supabase
      //   .from('family_profiles')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;
      
      // For development:
      const index = mockFamilyProfiles.findIndex(f => f.id === id);
      if (index === -1) return null;
      
      mockFamilyProfiles[index] = { ...mockFamilyProfiles[index], ...updates };
      return mockFamilyProfiles[index];
    } catch (error) {
      console.error(`Failed to update family profile with id ${id}:`, error);
      return null;
    }
  }
};
