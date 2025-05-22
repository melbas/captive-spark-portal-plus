
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { FamilyProfile, FamilyMember, UserRole } from "@/components/wifi-portal/types";

// Define types for the database tables to improve type safety
interface FamilyProfileRecord {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  created_at: string;
  expires_at: string;
  member_count: number;
  max_members: number;
  active: boolean;
}

interface WifiUserRecord {
  id: string;
  created_at?: string;
  last_connection?: string;
  auth_method?: string;
  email?: string;
  phone?: string;
  name?: string;
  mac_address?: string;
  role?: string;
  family_id?: string;
  active?: boolean;
}

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
      
      // Créer le profil familial dans la base de données
      // Note: Nous utilisons une requête SQL brute car la table family_profiles n'est pas encore dans les types générés
      const { error } = await supabase.rpc('create_family_profile', {
        p_id: id,
        p_name: familyName,
        p_owner_id: ownerUserId,
        p_owner_name: ownerData.name || 'Unknown',
        p_owner_email: ownerData.email,
        p_owner_phone: ownerData.phone,
        p_created_at: now,
        p_expires_at: expiryDate.toISOString(),
        p_member_count: 1,
        p_max_members: 5,
        p_active: true
      });
      
      if (error) {
        console.error("Error creating family profile:", error);
        return null;
      }
      
      // Mettre à jour le rôle de l'utilisateur
      // Note: Nous utilisons une requête SQL brute car le champ role n'est pas encore dans les types générés
      await supabase.rpc('update_user_role', {
        p_user_id: ownerUserId,
        p_role: 'owner',
        p_family_id: id
      });
      
      return {
        id,
        name: familyName,
        ownerId: ownerUserId,
        ownerName: ownerData.name || 'Unknown',
        ownerEmail: ownerData.email,
        ownerPhone: ownerData.phone,
        memberCount: 1,
        maxMembers: 5,
        createdAt: now,
        expiresAt: expiryDate.toISOString(),
        active: true,
        members: []
      };
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
      // Note: Nous utilisons une requête SQL brute car la table family_profiles n'est pas encore dans les types générés
      const { data, error } = await supabase.rpc('get_family_profile', {
        p_family_id: familyId
      });
      
      if (error) {
        console.error("Error fetching family profile:", error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      // Récupérer les membres de la famille
      // Note: Nous utilisons une requête SQL brute car les champs family_id et role ne sont pas encore dans les types générés
      const { data: membersData, error: membersError } = await supabase.rpc('get_family_members', {
        p_family_id: familyId
      });
      
      if (membersError) {
        console.error("Error fetching family members:", membersError);
        return null;
      }
      
      const members: FamilyMember[] = (membersData || []).map((member: any) => ({
        id: member.id,
        name: member.name || 'Unknown',
        email: member.email,
        phone: member.phone,
        macAddress: member.mac_address,
        joinedAt: member.created_at,
        lastActive: member.last_connection,
        active: member.active === undefined ? true : member.active,
        timeUsedMinutes: 0 // Cette valeur devrait être calculée à partir des sessions
      }));
      
      return {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        ownerName: data.owner_name,
        ownerEmail: data.owner_email,
        ownerPhone: data.owner_phone,
        memberCount: data.member_count,
        maxMembers: data.max_members,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        active: data.active,
        members
      };
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
      // Vérifier si le profil a déjà atteint le nombre maximum de membres
      const { data: familyData, error: familyError } = await supabase.rpc('get_family_profile', {
        p_family_id: familyId
      });
      
      if (familyError) {
        console.error("Error fetching family profile:", familyError);
        return null;
      }
      
      if (!familyData || familyData.member_count >= familyData.max_members) {
        console.error("Family profile has reached maximum member count");
        return null;
      }
      
      // Créer le nouveau membre
      const memberId = uuidv4();
      const now = new Date().toISOString();
      
      // Note: Nous utilisons une requête SQL brute car les champs family_id et role ne sont pas encore dans les types générés
      const { error } = await supabase.rpc('add_family_member', {
        p_id: memberId,
        p_name: memberData.name,
        p_email: memberData.email,
        p_phone: memberData.phone,
        p_mac_address: memberData.macAddress,
        p_created_at: now,
        p_last_connection: now,
        p_role: 'member',
        p_family_id: familyId,
        p_auth_method: 'family',
        p_active: true
      });
      
      if (error) {
        console.error("Error creating family member:", error);
        return null;
      }
      
      // Incrémenter le compteur de membres
      await supabase.rpc('increment_family_member_count', {
        p_family_id: familyId
      });
      
      return {
        id: memberId,
        name: memberData.name || 'Unknown',
        email: memberData.email,
        phone: memberData.phone,
        macAddress: memberData.macAddress,
        joinedAt: now,
        lastActive: now,
        active: true,
        timeUsedMinutes: 0
      };
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
      // Vérifier que l'utilisateur est bien un membre de cette famille
      const { data: memberData, error: memberError } = await supabase.rpc('get_family_member', {
        p_member_id: memberId,
        p_family_id: familyId
      });
      
      if (memberError || !memberData || memberData.role === 'owner') {
        console.error("Cannot remove member: invalid member or owner");
        return false;
      }
      
      // Supprimer le membre
      const { error } = await supabase.rpc('remove_family_member', {
        p_member_id: memberId
      });
      
      if (error) {
        console.error("Error removing family member:", error);
        return false;
      }
      
      // Décrémenter le compteur de membres
      await supabase.rpc('decrement_family_member_count', {
        p_family_id: familyId
      });
      
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
      // Vérifier que l'utilisateur est bien un membre de cette famille
      const { data: memberData, error: memberError } = await supabase.rpc('get_family_member', {
        p_member_id: memberId,
        p_family_id: familyId
      });
      
      if (memberError || !memberData || memberData.role === 'owner') {
        console.error("Cannot update member status: invalid member or owner");
        return false;
      }
      
      // Mettre à jour le statut du membre
      const { error } = await supabase.rpc('update_family_member_status', {
        p_member_id: memberId,
        p_is_active: isActive
      });
      
      if (error) {
        console.error("Error updating family member status:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update family member status:", error);
      return false;
    }
  }
};
