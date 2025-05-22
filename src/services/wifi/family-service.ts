
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { FamilyProfile, FamilyMember, UserRole } from "@/components/wifi-portal/types";

// Storage for mock data since we can't use the database directly yet
const mockFamilyProfiles: Map<string, FamilyProfile> = new Map();
const mockFamilyMembers: Map<string, FamilyMember> = new Map();

export const familyService = {
  /**
   * Crée un nouveau profil familial
   */
  async createFamilyProfile(ownerUserId: string, familyName: string): Promise<FamilyProfile | null> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // Expire après 30 jours
      
      // Récupérer les informations de l'utilisateur propriétaire
      const { data: ownerData, error: ownerError } = await supabase
        .from('wifi_users')
        .select('name, email, phone')
        .eq('id', ownerUserId)
        .single();
      
      if (ownerError) {
        console.error("Error fetching owner data:", ownerError);
        return null;
      }
      
      // Créer le profil familial (en mémoire pour l'instant)
      const profile: FamilyProfile = {
        id,
        name: familyName,
        ownerId: ownerUserId,
        ownerName: ownerData?.name || 'Unknown',
        ownerEmail: ownerData?.email,
        ownerPhone: ownerData?.phone,
        memberCount: 1,
        maxMembers: 5,
        createdAt: now,
        expiresAt: expiryDate.toISOString(),
        active: true,
        members: []
      };
      
      // Stocker le profil dans notre mock storage
      mockFamilyProfiles.set(id, profile);
      
      // Créer le premier membre (le propriétaire)
      const memberData: FamilyMember = {
        id: ownerUserId,
        name: ownerData?.name || 'Unknown',
        email: ownerData?.email,
        phone: ownerData?.phone,
        joinedAt: now,
        lastActive: now,
        active: true,
        timeUsedMinutes: 0
      };
      
      mockFamilyMembers.set(ownerUserId, memberData);
      profile.members.push(memberData);
      
      console.log("Created family profile with ID:", id);
      
      return profile;
    } catch (error) {
      console.error("Failed to create family profile:", error);
      return null;
    }
  },
  
  /**
   * Récupère les détails d'un profil familial
   */
  async getFamilyProfile(familyId: string): Promise<FamilyProfile | null> {
    try {
      // Récupérer le profil depuis notre mock storage
      const profile = mockFamilyProfiles.get(familyId);
      
      if (!profile) {
        console.error("Family profile not found:", familyId);
        return null;
      }
      
      return profile;
    } catch (error) {
      console.error("Failed to fetch family profile:", error);
      return null;
    }
  },
  
  /**
   * Ajoute un membre à un profil familial
   */
  async addFamilyMember(familyId: string, memberData: {
    name: string;
    email?: string;
    phone?: string;
    macAddress?: string;
  }): Promise<FamilyMember | null> {
    try {
      // Vérifier si le profil existe
      const profile = mockFamilyProfiles.get(familyId);
      
      if (!profile) {
        console.error("Family profile not found:", familyId);
        return null;
      }
      
      // Vérifier si le profil a déjà atteint le nombre maximum de membres
      if (profile.memberCount >= profile.maxMembers) {
        console.error("Family profile has reached maximum member count");
        return null;
      }
      
      // Créer le nouveau membre
      const memberId = uuidv4();
      const now = new Date().toISOString();
      
      const newMember: FamilyMember = {
        id: memberId,
        name: memberData.name,
        email: memberData.email,
        phone: memberData.phone,
        macAddress: memberData.macAddress,
        joinedAt: now,
        lastActive: now,
        active: true,
        timeUsedMinutes: 0
      };
      
      // Ajouter le membre à notre mock storage
      mockFamilyMembers.set(memberId, newMember);
      
      // Mettre à jour le profil
      profile.members.push(newMember);
      profile.memberCount++;
      
      return newMember;
    } catch (error) {
      console.error("Failed to add family member:", error);
      return null;
    }
  },
  
  /**
   * Supprime un membre d'un profil familial
   */
  async removeFamilyMember(familyId: string, memberId: string): Promise<boolean> {
    try {
      // Vérifier si le profil existe
      const profile = mockFamilyProfiles.get(familyId);
      
      if (!profile) {
        console.error("Family profile not found:", familyId);
        return false;
      }
      
      // Vérifier que le membre n'est pas le propriétaire
      if (profile.ownerId === memberId) {
        console.error("Cannot remove owner from family profile");
        return false;
      }
      
      // Vérifier que le membre existe
      const memberIndex = profile.members.findIndex(m => m.id === memberId);
      if (memberIndex === -1) {
        console.error("Member not found in family profile");
        return false;
      }
      
      // Supprimer le membre
      profile.members.splice(memberIndex, 1);
      mockFamilyMembers.delete(memberId);
      
      // Mettre à jour le compteur de membres
      if (profile.memberCount > 0) {
        profile.memberCount--;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to remove family member:", error);
      return false;
    }
  },
  
  /**
   * Active ou désactive un membre d'un profil familial
   */
  async toggleMemberStatus(familyId: string, memberId: string, isActive: boolean): Promise<boolean> {
    try {
      // Vérifier si le profil existe
      const profile = mockFamilyProfiles.get(familyId);
      
      if (!profile) {
        console.error("Family profile not found:", familyId);
        return false;
      }
      
      // Vérifier que le membre n'est pas le propriétaire
      if (profile.ownerId === memberId) {
        console.error("Cannot toggle owner status");
        return false;
      }
      
      // Vérifier que le membre existe
      const member = profile.members.find(m => m.id === memberId);
      if (!member) {
        console.error("Member not found in family profile");
        return false;
      }
      
      // Mettre à jour le statut du membre
      member.active = isActive;
      
      // Mettre à jour dans notre mock storage également
      const storedMember = mockFamilyMembers.get(memberId);
      if (storedMember) {
        storedMember.active = isActive;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update family member status:", error);
      return false;
    }
  }
};
