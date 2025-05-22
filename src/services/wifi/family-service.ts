
import { supabase } from "@/integrations/supabase/client";
import { FamilyProfile, FamilyMember, UserRole } from "@/components/wifi-portal/types";
import { v4 as uuidv4 } from 'uuid';

// Mock data for development
const mockFamilyProfiles: FamilyProfile[] = [
  {
    id: "f1",
    name: "Smith Family",
    ownerId: "u1",
    ownerName: "John Smith",
    ownerEmail: "john@example.com",
    ownerPhone: "+1234567890",
    memberCount: 3,
    maxMembers: 5,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    members: [
      {
        id: "u1",
        name: "John Smith",
        email: "john@example.com",
        phone: "+1234567890",
        macAddress: "00:1A:2B:3C:4D:5E",
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        active: true,
        timeUsedMinutes: 120
      },
      {
        id: "u2",
        name: "Jane Smith",
        email: "jane@example.com",
        joinedAt: new Date().toISOString(),
        active: true,
        timeUsedMinutes: 85
      },
      {
        id: "u3",
        name: "Billy Smith",
        joinedAt: new Date().toISOString(),
        active: false,
        timeUsedMinutes: 45
      }
    ]
  }
];

// Family service implementation
export const familyService = {
  getFamilyProfiles: async (): Promise<FamilyProfile[]> => {
    // In a real implementation, we would call the database
    // const { data, error } = await supabase.from("family_profiles").select("*");
    
    return mockFamilyProfiles;
  },
  
  getFamilyProfile: async (id: string): Promise<FamilyProfile> => {
    // In a real implementation, we would call the database
    // const { data, error } = await supabase.from("family_profiles").select("*").eq("id", id).single();
    
    const profile = mockFamilyProfiles.find(p => p.id === id);
    if (!profile) throw new Error("Family profile not found");
    
    return profile;
  },
  
  getUserFamily: async (userId: string): Promise<FamilyProfile | null> => {
    // In a real implementation, we would call the database to find the user's family
    // const { data, error } = await supabase.rpc("get_user_family", { user_id: userId });
    
    const profile = mockFamilyProfiles.find(p => p.members.some(m => m.id === userId));
    return profile || null;
  },
  
  createFamilyProfile: async (userId: string, name: string): Promise<FamilyProfile> => {
    // In a real implementation, we would create a family profile in the database
    // const { data, error } = await supabase.rpc("create_family_profile", { owner_id: userId, name });
    
    const newId = uuidv4();
    
    const mockUser = {
      id: userId,
      name: "Mock User",
      email: "user@example.com",
      active: true,
      joinedAt: new Date().toISOString(),
      timeUsedMinutes: 0
    };
    
    const newProfile: FamilyProfile = {
      id: newId,
      name,
      ownerId: userId,
      ownerName: mockUser.name,
      ownerEmail: mockUser.email,
      memberCount: 1,
      maxMembers: 5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      members: [mockUser]
    };
    
    mockFamilyProfiles.push(newProfile);
    
    return newProfile;
  },
  
  addFamilyMember: async (familyId: string, memberData: { name: string; email?: string; phone?: string; macAddress?: string }): Promise<FamilyMember | null> => {
    // In a real implementation, we would add a member to the family in the database
    // const { data, error } = await supabase.rpc("add_family_member", { family_id: familyId, member_data });
    
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    if (familyIndex === -1) return null;
    
    const family = mockFamilyProfiles[familyIndex];
    
    if (family.memberCount >= family.maxMembers) {
      return null;
    }
    
    const newMember: FamilyMember = {
      id: uuidv4(),
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      macAddress: memberData.macAddress,
      joinedAt: new Date().toISOString(),
      active: true,
      timeUsedMinutes: 0
    };
    
    family.members.push(newMember);
    family.memberCount = family.members.length;
    
    return newMember;
  },
  
  removeFamilyMember: async (familyId: string, memberId: string): Promise<boolean> => {
    // In a real implementation, we would remove the member from the family in the database
    // const { data, error } = await supabase.rpc("remove_family_member", { family_id: familyId, member_id: memberId });
    
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    if (familyIndex === -1) return false;
    
    const family = mockFamilyProfiles[familyIndex];
    
    // Cannot remove the owner
    if (memberId === family.ownerId) {
      return false;
    }
    
    const initialLength = family.members.length;
    family.members = family.members.filter(m => m.id !== memberId);
    family.memberCount = family.members.length;
    
    return family.members.length < initialLength;
  },
  
  updateFamilyMember: async (familyId: string, memberId: string, updates: Partial<FamilyMember>): Promise<boolean> => {
    // In a real implementation, we would update the member in the database
    // const { data, error } = await supabase.rpc("update_family_member", { family_id: familyId, member_id: memberId, updates });
    
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    if (familyIndex === -1) return false;
    
    const family = mockFamilyProfiles[familyIndex];
    const memberIndex = family.members.findIndex(m => m.id === memberId);
    
    if (memberIndex === -1) return false;
    
    family.members[memberIndex] = {
      ...family.members[memberIndex],
      ...updates
    };
    
    return true;
  },
  
  getUserFamilyRole: async (userId: string, familyId?: string): Promise<UserRole> => {
    // In a real implementation, we would query the database to determine the user's role
    // const { data, error } = await supabase.rpc("get_user_family_role", { user_id: userId, family_id: familyId });
    
    if (!familyId) {
      const userFamily = await familyService.getUserFamily(userId);
      if (!userFamily) return UserRole.INDIVIDUAL;
      familyId = userFamily.id;
    }
    
    const family = mockFamilyProfiles.find(p => p.id === familyId);
    if (!family) return UserRole.INDIVIDUAL;
    
    if (family.ownerId === userId) return UserRole.OWNER;
    
    const isMember = family.members.some(m => m.id === userId);
    return isMember ? UserRole.MEMBER : UserRole.INDIVIDUAL;
  }
};
