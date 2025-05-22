
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { RadiusClient, RadiusAuthLog, RadiusAccountingLog } from "@/components/wifi-portal/types";

export const radiusService = {
  /**
   * Récupère tous les clients RADIUS
   */
  async getRadiusClients(): Promise<RadiusClient[]> {
    try {
      const { data, error } = await supabase
        .from('radius_clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Error fetching RADIUS clients:", error);
        return [];
      }
      
      return data.map(client => ({
        id: client.id,
        name: client.name,
        shortname: client.shortname,
        nastype: client.nastype,
        secret: client.secret,
        ipAddress: client.ip_address,
        description: client.description,
        isActive: client.is_active
      }));
    } catch (error) {
      console.error("Failed to fetch RADIUS clients:", error);
      return [];
    }
  },
  
  /**
   * Crée un nouveau client RADIUS
   */
  async createRadiusClient(clientData: {
    name: string;
    shortname: string;
    nastype: string;
    secret: string;
    ipAddress: string;
    description?: string;
  }): Promise<RadiusClient | null> {
    try {
      const id = uuidv4();
      
      const { data, error } = await supabase
        .from('radius_clients')
        .insert({
          id,
          name: clientData.name,
          shortname: clientData.shortname,
          nastype: clientData.nastype,
          secret: clientData.secret,
          ip_address: clientData.ipAddress,
          description: clientData.description,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating RADIUS client:", error);
        return null;
      }
      
      return {
        id: data.id,
        name: data.name,
        shortname: data.shortname,
        nastype: data.nastype,
        secret: data.secret,
        ipAddress: data.ip_address,
        description: data.description,
        isActive: data.is_active
      };
    } catch (error) {
      console.error("Failed to create RADIUS client:", error);
      return null;
    }
  },
  
  /**
   * Met à jour un client RADIUS existant
   */
  async updateRadiusClient(id: string, clientData: {
    name?: string;
    shortname?: string;
    nastype?: string;
    secret?: string;
    ipAddress?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<boolean> {
    try {
      // Convertir les propriétés en format snake_case pour la base de données
      const updateData: Record<string, any> = {};
      if (clientData.name) updateData.name = clientData.name;
      if (clientData.shortname) updateData.shortname = clientData.shortname;
      if (clientData.nastype) updateData.nastype = clientData.nastype;
      if (clientData.secret) updateData.secret = clientData.secret;
      if (clientData.ipAddress) updateData.ip_address = clientData.ipAddress;
      if (clientData.description !== undefined) updateData.description = clientData.description;
      if (clientData.isActive !== undefined) updateData.is_active = clientData.isActive;
      
      const { error } = await supabase
        .from('radius_clients')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error("Error updating RADIUS client:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update RADIUS client:", error);
      return false;
    }
  },
  
  /**
   * Récupère les journaux d'authentification RADIUS
   */
  async getAuthLogs(limit: number = 100): Promise<RadiusAuthLog[]> {
    try {
      const { data, error } = await supabase
        .from('radius_auth_logs')
        .select('*')
        .order('auth_date', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching RADIUS auth logs:", error);
        return [];
      }
      
      return data.map(log => ({
        id: log.id,
        username: log.username,
        nasipaddress: log.nasipaddress,
        nasportid: log.nasportid,
        authDate: log.auth_date,
        authStatus: log.auth_status,
        failureReason: log.failure_reason
      }));
    } catch (error) {
      console.error("Failed to fetch RADIUS auth logs:", error);
      return [];
    }
  },
  
  /**
   * Récupère les journaux de comptabilité RADIUS
   */
  async getAccountingLogs(limit: number = 100): Promise<RadiusAccountingLog[]> {
    try {
      const { data, error } = await supabase
        .from('radius_accounting_logs')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching RADIUS accounting logs:", error);
        return [];
      }
      
      return data.map(log => ({
        id: log.id,
        username: log.username,
        acctSessionId: log.acct_session_id,
        acctSessionTime: log.acct_session_time,
        acctInputOctets: log.acct_input_octets,
        acctOutputOctets: log.acct_output_octets,
        nasipaddress: log.nasipaddress,
        startTime: log.start_time,
        stopTime: log.stop_time,
        terminationCause: log.termination_cause
      }));
    } catch (error) {
      console.error("Failed to fetch RADIUS accounting logs:", error);
      return [];
    }
  }
};
