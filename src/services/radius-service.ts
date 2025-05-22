
import { supabase } from "@/integrations/supabase/client";
import { RadiusClient, RadiusAuthLog, RadiusAccountingLog } from "@/components/wifi-portal/types";

export const radiusService = {
  /**
   * Récupère tous les clients RADIUS
   */
  async getRadiusClients(): Promise<RadiusClient[]> {
    try {
      // Pour l'instant, nous utilisons des données simulées car la table n'est pas encore créée
      const mockClients: RadiusClient[] = [
        {
          id: "1",
          name: "Access Point 1",
          shortname: "AP1",
          nastype: "cisco",
          secret: "********",
          ipAddress: "192.168.1.1",
          description: "Main entrance access point",
          isActive: true
        },
        {
          id: "2",
          name: "Access Point 2",
          shortname: "AP2",
          nastype: "mikrotik",
          secret: "********",
          ipAddress: "192.168.1.2",
          description: "Lobby area access point",
          isActive: true
        }
      ];
      
      return mockClients;
    } catch (error) {
      console.error("Failed to get RADIUS clients:", error);
      return [];
    }
  },
  
  /**
   * Récupère les journaux d'authentification RADIUS
   */
  async getAuthLogs(limit: number = 100, offset: number = 0): Promise<RadiusAuthLog[]> {
    try {
      // Pour l'instant, nous utilisons des données simulées car la table n'est pas encore créée
      const mockLogs: RadiusAuthLog[] = Array.from({ length: 10 }, (_, i) => ({
        id: `auth-${i}`,
        username: `user-${i % 3}@example.com`,
        nasipaddress: `192.168.1.${i % 3 + 1}`,
        nasportid: `port-${i}`,
        authDate: new Date(Date.now() - i * 3600000).toISOString(),
        authStatus: i % 5 === 0 ? "reject" : "accept",
        failureReason: i % 5 === 0 ? "Invalid credentials" : undefined
      }));
      
      return mockLogs;
    } catch (error) {
      console.error("Failed to get RADIUS auth logs:", error);
      return [];
    }
  },
  
  /**
   * Récupère les journaux de comptabilité RADIUS
   */
  async getAccountingLogs(limit: number = 100, offset: number = 0): Promise<RadiusAccountingLog[]> {
    try {
      // Pour l'instant, nous utilisons des données simulées car la table n'est pas encore créée
      const mockLogs: RadiusAccountingLog[] = Array.from({ length: 10 }, (_, i) => ({
        id: `acct-${i}`,
        username: `user-${i % 3}@example.com`,
        acctSessionId: `session-${i}`,
        acctSessionTime: Math.floor(Math.random() * 3600),
        acctInputOctets: Math.floor(Math.random() * 10000000),
        acctOutputOctets: Math.floor(Math.random() * 20000000),
        nasipaddress: `192.168.1.${i % 3 + 1}`,
        startTime: new Date(Date.now() - i * 7200000).toISOString(),
        stopTime: i % 3 === 0 ? undefined : new Date(Date.now() - i * 3600000).toISOString(),
        terminationCause: i % 3 === 0 ? undefined : "User-Request"
      }));
      
      return mockLogs;
    } catch (error) {
      console.error("Failed to get RADIUS accounting logs:", error);
      return [];
    }
  }
};
