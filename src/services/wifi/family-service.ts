
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { FamilyProfile, FamilyMember, UserRole } from "@/components/wifi-portal/types";

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
      const { data, error } = await supabase
        .from('family_profiles')
        .insert({
          id,
          name: familyName,
          owner_id: ownerUserId,
          owner_name: ownerData.name || 'Unknown',
          owner_email: ownerData.email,
          owner_phone: ownerData.phone,
          created_at: now,
          expires_at: expiryDate.toISOString(),
          member_count: 1, // Le propriétaire est compté comme un membre
          max_members: 5,
          active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating family profile:", error);
        return null;
      }
      
      // Mettre à jour le rôle de l'utilisateur
      await supabase
        .from('wifi_users')
        .update({ 
          role: UserRole.OWNER,
          family_id: id
        })
        .eq('id', ownerUserId);
      
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
      // Récupérer les informations du profil familial
      const { data, error } = await supabase
        .from('family_profiles')
        .select('*')
        .eq('id', familyId)
        .single();
      
      if (error) {
        console.error("Error fetching family profile:", error);
        return null;
      }
      
      // Récupérer les membres de la famille
      const { data: membersData, error: membersError } = await supabase
        .from('wifi_users')
        .select('id, name, email, phone, mac_address, created_at as joined_at, last_connection, family_role')
        .eq('family_id', familyId);
      
      if (membersError) {
        console.error("Error fetching family members:", membersError);
        return null;
      }
      
      const members: FamilyMember[] = membersData.map(member => ({
        id: member.id,
        name: member.name || 'Unknown',
        email: member.email,
        phone: member.phone,
        macAddress: member.mac_address,
        joinedAt: member.joined_at,
        lastActive: member.last_connection,
        active: true,
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
      const { data: familyData, error: familyError } = await supabase
        .from('family_profiles')
        .select('member_count, max_members')
        .eq('id', familyId)
        .single();
      
      if (familyError) {
        console.error("Error fetching family profile:", familyError);
        return null;
      }
      
      if (familyData.member_count >= familyData.max_members) {
        console.error("Family profile has reached maximum member count");
        return null;
      }
      
      // Créer le nouveau membre
      const memberId = uuidv4();
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('wifi_users')
        .insert({
          id: memberId,
          name: memberData.name,
          email: memberData.email,
          phone: memberData.phone,
          mac_address: memberData.macAddress,
          created_at: now,
          last_connection: now,
          role: UserRole.MEMBER,
          family_id: familyId,
          auth_method: 'family'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating family member:", error);
        return null;
      }
      
      // Incrémenter le compteur de membres
      await supabase
        .from('family_profiles')
        .update({ 
          member_count: familyData.member_count + 1 
        })
        .eq('id', familyId);
      
      return {
        id: data.id,
        name: data.name || 'Unknown',
        email: data.email,
        phone: data.phone,
        macAddress: data.mac_address,
        joinedAt: data.created_at,
        lastActive: data.last_connection,
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
      const { data: memberData, error: memberError } = await supabase
        .from('wifi_users')
        .select('role, family_id')
        .eq('id', memberId)
        .single();
      
      if (memberError || memberData.family_id !== familyId || memberData.role === UserRole.OWNER) {
        console.error("Cannot remove member: invalid member or owner");
        return false;
      }
      
      // Supprimer le membre
      const { error } = await supabase
        .from('wifi_users')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        console.error("Error removing family member:", error);
        return false;
      }
      
      // Décrémenter le compteur de membres
      await supabase
        .from('family_profiles')
        .update({ 
          member_count: supabase.rpc('decrement_counter', { row_id: familyId })
        })
        .eq('id', familyId);
      
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
      const { data: memberData, error: memberError } = await supabase
        .from('wifi_users')
        .select('role, family_id')
        .eq('id', memberId)
        .single();
      
      if (memberError || memberData.family_id !== familyId || memberData.role === UserRole.OWNER) {
        console.error("Cannot update member status: invalid member or owner");
        return false;
      }
      
      // Mettre à jour le statut du membre
      const { error } = await supabase
        .from('wifi_users')
        .update({ active: isActive })
        .eq('id', memberId);
      
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
