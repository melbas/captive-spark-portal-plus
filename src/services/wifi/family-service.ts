
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { FamilyProfile, FamilyMember, FamilyInvite, FamilyActivityLog } from "./types";
import { FamilyRole } from "@/components/wifi-portal/types";

// Données de simulation en mémoire pour le développement
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

const mockFamilyInvites: FamilyInvite[] = [];
const mockActivityLogs: FamilyActivityLog[] = [];

export const familyService = {
  async getFamilyProfiles(): Promise<FamilyProfile[]> {
    try {
      // En production, nous ferions une requête à Supabase
      // const { data, error } = await supabase.from('family_profiles').select('*');
      // if (error) throw error;
      // return data;
      
      // Pour le développement, retournons des données simulées
      return mockFamilyProfiles;
    } catch (error) {
      console.error("Failed to get family profiles:", error);
      return [];
    }
  },
  
  async getFamilyProfile(id: string): Promise<FamilyProfile | null> {
    try {
      // En production:
      // const { data, error } = await supabase
      //   .from('family_profiles')
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      // if (error) throw error;
      // return data;
      
      // Pour le développement:
      const profile = mockFamilyProfiles.find(p => p.id === id);
      return profile || null;
    } catch (error) {
      console.error(`Failed to get family profile with id ${id}:`, error);
      return null;
    }
  },
  
  async getUserFamily(userId: string): Promise<FamilyProfile | null> {
    try {
      // En production:
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
      
      // Pour le développement:
      const member = mockFamilyMembers.find(m => m.user_id === userId);
      if (!member) return null;
      
      const family = mockFamilyProfiles.find(f => f.id === member.family_id);
      return family || null;
    } catch (error) {
      console.error(`Failed to get family for user with id ${userId}:`, error);
      return null;
    }
  },
  
  async createFamilyProfile(name: string, ownerId: string, ownerName?: string, ownerEmail?: string, ownerPhone?: string): Promise<FamilyProfile | null> {
    try {
      const familyId = `fam-${Math.random().toString(36).substring(2, 8)}`;
      const memberCount = 1; // Propriétaire initial
      const maxMembers = 5; // Limite de 5 membres maximum
      
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Expire après 1 mois
      
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
      
      // En production:
      // const { data: familyData, error: familyError } = await supabase
      //   .from('family_profiles')
      //   .insert(newFamily)
      //   .select()
      //   .single();
      // if (familyError) throw familyError;
      
      // Ajout du propriétaire comme premier membre
      const memberId = `mem-${Math.random().toString(36).substring(2, 8)}`;
      const newMember: FamilyMember = {
        id: memberId,
        family_id: familyId,
        user_id: ownerId,
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        role: "owner",
        active: true,
        added_at: now.toISOString()
      };
      
      // En production:
      // const { error: memberError } = await supabase
      //   .from('family_members')
      //   .insert(newMember);
      // if (memberError) throw memberError;
      
      // Pour le développement:
      mockFamilyProfiles.push(newFamily);
      mockFamilyMembers.push(newMember);
      
      // Ajouter une entrée d'activité pour la création
      await this.logFamilyActivity(familyId, ownerId, ownerName, 'join', {
        role: 'owner',
        action: 'created_family'
      });
      
      return newFamily;
    } catch (error) {
      console.error("Failed to create family profile:", error);
      return null;
    }
  },
  
  async updateFamilyProfile(id: string, updates: Partial<FamilyProfile>): Promise<FamilyProfile | null> {
    try {
      // En production:
      // const { data, error } = await supabase
      //   .from('family_profiles')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;
      
      // Pour le développement:
      const index = mockFamilyProfiles.findIndex(f => f.id === id);
      if (index === -1) return null;
      
      mockFamilyProfiles[index] = { ...mockFamilyProfiles[index], ...updates };
      return mockFamilyProfiles[index];
    } catch (error) {
      console.error(`Failed to update family profile with id ${id}:`, error);
      return null;
    }
  },
  
  async addFamilyMember(familyId: string, userData: { id: string; name?: string; email?: string; phone?: string }, role: FamilyRole = 'member'): Promise<FamilyMember | null> {
    try {
      // Vérifier si la famille existe et a de la place
      const family = await this.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      if (family.member_count >= family.max_members) throw new Error("Family is at maximum capacity");
      
      // Vérifier si l'utilisateur n'est pas déjà membre
      const existingMember = mockFamilyMembers.find(m => m.family_id === familyId && m.user_id === userData.id);
      if (existingMember) throw new Error("User is already a member of this family");
      
      const memberId = `mem-${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      
      const newMember: FamilyMember = {
        id: memberId,
        family_id: familyId,
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: role as 'owner' | 'member' | 'child',
        active: true,
        added_at: now
      };
      
      // En production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .insert(newMember)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // Pour le développement:
      mockFamilyMembers.push(newMember);
      
      // Mettre à jour le nombre de membres
      await this.updateFamilyProfile(familyId, {
        member_count: family.member_count + 1
      });
      
      // Ajouter une entrée d'activité
      await this.logFamilyActivity(familyId, userData.id, userData.name, 'join', { 
        role: role 
      });
      
      return newMember;
    } catch (error) {
      console.error(`Failed to add member to family ${familyId}:`, error);
      return null;
    }
  },
  
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      // En production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .select('*')
      //   .eq('family_id', familyId);
      // if (error) throw error;
      // return data;
      
      // Pour le développement:
      return mockFamilyMembers.filter(m => m.family_id === familyId);
    } catch (error) {
      console.error(`Failed to get members for family ${familyId}:`, error);
      return [];
    }
  },
  
  async toggleMemberStatus(memberId: string, active: boolean): Promise<FamilyMember | null> {
    try {
      // En production:
      // const { data, error } = await supabase
      //   .from('family_members')
      //   .update({ active })
      //   .eq('id', memberId)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // Pour le développement:
      const index = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (index === -1) return null;
      
      mockFamilyMembers[index] = { ...mockFamilyMembers[index], active };
      
      // Ajouter une entrée d'activité
      const member = mockFamilyMembers[index];
      await this.logFamilyActivity(
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
  
  async removeFamilyMember(memberId: string): Promise<boolean> {
    try {
      // En production:
      // Trouver d'abord le membre pour obtenir l'ID de famille
      // const { data: member, error: memberGetError } = await supabase
      //   .from('family_members')
      //   .select('*')
      //   .eq('id', memberId)
      //   .single();
      // if (memberGetError) throw memberGetError;
      
      // const familyId = member.family_id;
      
      // Obtenir la famille pour réduire le nombre de membres
      // const { data: family, error: familyError } = await supabase
      //   .from('family_profiles')
      //   .select('*')
      //   .eq('id', familyId)
      //   .single();
      // if (familyError) throw familyError;
      
      // Supprimer le membre
      // const { error: deleteError } = await supabase
      //   .from('family_members')
      //   .delete()
      //   .eq('id', memberId);
      // if (deleteError) throw deleteError;
      
      // Pour le développement:
      const memberIndex = mockFamilyMembers.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return false;
      
      const member = mockFamilyMembers[memberIndex];
      const familyId = member.family_id;
      
      // Ne pas supprimer le propriétaire
      if (member.role === 'owner') {
        throw new Error("Cannot remove the family owner");
      }
      
      // Obtenir la famille
      const family = await this.getFamilyProfile(familyId);
      if (!family) throw new Error("Family not found");
      
      // Ajouter une entrée d'activité
      await this.logFamilyActivity(
        familyId, 
        member.user_id, 
        member.name, 
        'remove_member',
        { memberId, role: member.role }
      );
      
      // Supprimer le membre
      mockFamilyMembers.splice(memberIndex, 1);
      
      // Mettre à jour le nombre de membres
      await this.updateFamilyProfile(familyId, {
        member_count: Math.max(1, family.member_count - 1)
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to remove member ${memberId}:`, error);
      return false;
    }
  },
  
  async getUserFamilyRole(userId: string, familyId?: string): Promise<FamilyRole | null> {
    try {
      let member;
      
      if (familyId) {
        // Si l'ID de famille est fourni, rechercher le membre spécifique
        // En production:
        // const { data, error } = await supabase
        //   .from('family_members')
        //   .select('*')
        //   .eq('family_id', familyId)
        //   .eq('user_id', userId)
        //   .single();
        // if (error) throw error;
        // member = data;
        
        // Pour le développement:
        member = mockFamilyMembers.find(m => m.family_id === familyId && m.user_id === userId);
      } else {
        // Sinon, trouver le premier rôle de famille pour l'utilisateur
        // En production:
        // const { data, error } = await supabase
        //   .from('family_members')
        //   .select('*')
        //   .eq('user_id', userId)
        //   .limit(1)
        //   .single();
        // if (error) throw error;
        // member = data;
        
        // Pour le développement:
        member = mockFamilyMembers.find(m => m.user_id === userId);
      }
      
      if (!member) return null;
      return member.role as FamilyRole;
    } catch (error) {
      console.error(`Failed to get role for user ${userId}:`, error);
      return null;
    }
  },
  
  async logFamilyActivity(familyId: string, userId?: string, userName?: string, action?: string, details?: any): Promise<void> {
    try {
      const logId = `log-${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      
      const logEntry: FamilyActivityLog = {
        id: logId,
        family_id: familyId,
        user_id: userId,
        user_name: userName,
        action: action as any,
        details: details || {},
        timestamp: now
      };
      
      // En production:
      // const { error } = await supabase
      //   .from('family_activity_logs')
      //   .insert(logEntry);
      // if (error) throw error;
      
      // Pour le développement:
      mockActivityLogs.push(logEntry);
    } catch (error) {
      console.error(`Failed to log family activity:`, error);
    }
  },
  
  async getFamilyActivityLogs(familyId: string): Promise<FamilyActivityLog[]> {
    try {
      // En production:
      // const { data, error } = await supabase
      //   .from('family_activity_logs')
      //   .select('*')
      //   .eq('family_id', familyId)
      //   .order('timestamp', { ascending: false });
      // if (error) throw error;
      // return data;
      
      // Pour le développement:
      return mockActivityLogs
        .filter(log => log.family_id === familyId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error(`Failed to get activity logs for family ${familyId}:`, error);
      return [];
    }
  },
  
  async createFamilyInvite(familyId: string, contactInfo: { email?: string; phone?: string; name?: string }, role: FamilyRole = 'member'): Promise<FamilyInvite | null> {
    try {
      const inviteId = `inv-${Math.random().toString(36).substring(2, 8)}`;
      const token = Math.random().toString(36).substring(2, 15);
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire après 7 jours
      
      const newInvite: FamilyInvite = {
        id: inviteId,
        family_id: familyId,
        email: contactInfo.email,
        phone: contactInfo.phone,
        name: contactInfo.name,
        role: role as 'member' | 'child',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        token: token
      };
      
      // En production:
      // const { data, error } = await supabase
      //   .from('family_invites')
      //   .insert(newInvite)
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // Pour le développement:
      mockFamilyInvites.push(newInvite);
      
      // TODO: Envoyer un e-mail ou un SMS avec le lien d'invitation
      // contenant le token
      
      return newInvite;
    } catch (error) {
      console.error(`Failed to create family invite:`, error);
      return null;
    }
  }
};
