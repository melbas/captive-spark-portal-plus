
import { FamilyProfile, FamilyMember, UserData, UserRole } from '@/components/wifi-portal/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data for family profiles
const mockFamilyProfiles: FamilyProfile[] = [
  {
    id: "1",
    name: "Doe Family",
    ownerId: "user1",
    ownerName: "John Doe",
    ownerEmail: "john.doe@example.com",
    ownerPhone: "+1234567890",
    memberCount: 3,
    maxMembers: 5,
    createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 3600000).toISOString(),
    active: true,
    members: [
      {
        id: "member1",
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        macAddress: "00:11:22:33:44:55",
        joinedAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
        lastActive: new Date().toISOString(),
        active: true,
        timeUsedMinutes: 120
      },
      {
        id: "member2",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        phone: "+1234567891",
        macAddress: "00:11:22:33:44:56",
        joinedAt: new Date(Date.now() - 25 * 24 * 3600000).toISOString(),
        lastActive: new Date(Date.now() - 2 * 3600000).toISOString(),
        active: true,
        timeUsedMinutes: 90
      },
      {
        id: "member3",
        name: "Jimmy Doe",
        email: "jimmy.doe@example.com",
        joinedAt: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
        active: true,
        timeUsedMinutes: 45
      }
    ]
  }
];

// Family profile service
export const familyService = {
  // Get all family profiles
  getFamilyProfiles: async (): Promise<FamilyProfile[]> => {
    console.log('Getting family profiles');
    return mockFamilyProfiles;
  },

  // Get a family profile by ID
  getFamilyProfile: async (id: string): Promise<FamilyProfile | null> => {
    console.log(`Getting family profile with ID: ${id}`);
    const profile = mockFamilyProfiles.find(p => p.id === id);
    return profile || null;
  },

  // Get a user's family profile (by user ID)
  getUserFamily: async (userId: string): Promise<FamilyProfile | null> => {
    console.log(`Getting family profile for user with ID: ${userId}`);
    // Check if user is an owner
    const ownerProfile = mockFamilyProfiles.find(p => p.ownerId === userId);
    if (ownerProfile) return ownerProfile;
    
    // Check if user is a member
    for (const profile of mockFamilyProfiles) {
      const isMember = profile.members.some(m => m.id === userId);
      if (isMember) return profile;
    }
    
    return null;
  },

  // Create a new family profile
  createFamilyProfile: async (
    ownerData: { id: string; name: string; email?: string; phone?: string },
    familyName: string
  ): Promise<FamilyProfile> => {
    console.log('Creating new family profile', { ownerData, familyName });
    const newProfile: FamilyProfile = {
      id: uuidv4(),
      name: familyName,
      ownerId: ownerData.id,
      ownerName: ownerData.name,
      ownerEmail: ownerData.email,
      ownerPhone: ownerData.phone,
      memberCount: 1,
      maxMembers: 5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 3600000).toISOString(), // 90 days
      active: true,
      members: [
        {
          id: ownerData.id,
          name: ownerData.name,
          email: ownerData.email,
          phone: ownerData.phone,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          active: true,
          timeUsedMinutes: 0
        }
      ]
    };
    
    mockFamilyProfiles.push(newProfile);
    return newProfile;
  },

  // Add a member to a family profile
  addFamilyMember: async (
    familyId: string,
    memberData: { name: string; email?: string; phone?: string; macAddress?: string }
  ): Promise<FamilyMember | null> => {
    console.log(`Adding member to family with ID: ${familyId}`, memberData);
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    
    if (familyIndex === -1) return null;
    
    const family = mockFamilyProfiles[familyIndex];
    
    // Check if family has reached max members
    if (family.memberCount >= family.maxMembers) {
      console.error('Family has reached maximum members limit');
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
    
    // Update the mock data
    mockFamilyProfiles[familyIndex] = family;
    
    return newMember;
  },

  // Remove a member from a family profile
  removeFamilyMember: async (familyId: string, memberId: string): Promise<boolean> => {
    console.log(`Removing member ${memberId} from family ${familyId}`);
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    
    if (familyIndex === -1) return false;
    
    const family = mockFamilyProfiles[familyIndex];
    
    // Check if member exists
    const memberIndex = family.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return false;
    
    // Check if member is the owner
    if (family.members[memberIndex].id === family.ownerId) {
      console.error('Cannot remove the owner from the family');
      return false;
    }
    
    // Remove member
    family.members.splice(memberIndex, 1);
    family.memberCount = family.members.length;
    
    // Update the mock data
    mockFamilyProfiles[familyIndex] = family;
    
    return true;
  },

  // Update a family member
  updateFamilyMember: async (
    familyId: string,
    memberId: string,
    updateData: Partial<FamilyMember>
  ): Promise<FamilyMember | null> => {
    console.log(`Updating member ${memberId} in family ${familyId}`, updateData);
    const familyIndex = mockFamilyProfiles.findIndex(p => p.id === familyId);
    
    if (familyIndex === -1) return null;
    
    const family = mockFamilyProfiles[familyIndex];
    
    // Find the member
    const memberIndex = family.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return null;
    
    // Update member data
    family.members[memberIndex] = {
      ...family.members[memberIndex],
      ...updateData
    };
    
    // Update the mock data
    mockFamilyProfiles[familyIndex] = family;
    
    return family.members[memberIndex];
  },

  // Get a user's role in a family
  getUserFamilyRole: async (userId: string, familyId?: string): Promise<UserRole> => {
    console.log(`Getting role for user ${userId} in family ${familyId || 'any'}`);
    let family: FamilyProfile | undefined;
    
    if (familyId) {
      // Find the specific family
      family = mockFamilyProfiles.find(p => p.id === familyId);
      if (!family) return UserRole.INDIVIDUAL;
    } else {
      // Find any family with this user
      family = mockFamilyProfiles.find(p => 
        p.ownerId === userId || p.members.some(m => m.id === userId)
      );
      if (!family) return UserRole.INDIVIDUAL;
    }
    
    // Check if user is the owner
    if (family.ownerId === userId) return UserRole.OWNER;
    
    // Check if user is a member
    const isMember = family.members.some(m => m.id === userId && m.id !== family?.ownerId);
    if (isMember) return UserRole.MEMBER;
    
    return UserRole.INDIVIDUAL;
  }
};
