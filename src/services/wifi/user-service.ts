
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { WifiUser } from "./types";
import { smsService } from "./sms-service";
import { statisticsService } from "./statistics-service";

/**
 * Drapeau d'intégration Edge : quand `VITE_USE_EDGE_AUTH=true`, la création de user
 * passe par l'Edge Function `verify-otp` (qui crée le user côté serveur) au lieu d'un
 * insert client direct sur `wifi_users` (politiques anon larges — P0 sécurité AUDIT-BACKEND).
 * Par défaut (démo/staging), l'insert client direct est conservé.
 * En prod : activer le drapeau + verrouiller les policies anon (cf. docs/RAPPORT-PORTAIL.md).
 */
const USE_EDGE_AUTH = import.meta.env.VITE_USE_EDGE_AUTH === "true";

export const userService = {
  async createUser(userData: WifiUser & { code?: string; site_id?: string }): Promise<WifiUser | null> {
    try {
      if (USE_EDGE_AUTH) {
        // Chemin Edge : verify-otp valide l'OTP et crée/find le user côté serveur.
        const { data, error } = await supabase.functions.invoke("verify-otp", {
          body: {
            phone: userData.phone,
            email: userData.email,
            code: userData.code,
            mac_address: userData.mac_address,
            site_id: userData.site_id,
            auth_method: userData.auth_method,
          },
        });
        if (error || !data?.userId) {
          console.error("Edge verify-otp a échoué:", error || data);
          throw error || new Error("verify-otp: réponse sans userId");
        }
        const user: WifiUser = {
          id: data.userId,
          auth_method: userData.auth_method,
          email: userData.email,
          phone: userData.phone,
          name: userData.name,
          mac_address: userData.mac_address,
        };
        await statisticsService.incrementStatistic("total_connections");
        return user;
      }

      // Chemin démo/staging : insert client direct (à supprimer en prod, voir rapport).
      if (!userData.id) {
        userData.id = uuidv4();
      }

      const { code: _otp, site_id: _site, ...insertData } = userData;
      const { data, error } = await supabase
        .from('wifi_users')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        throw error; // Throw error for better handling in UI
      }

      // Send welcome SMS if phone number is provided
      if (insertData.phone && insertData.auth_method === 'sms') {
        await smsService.sendSMS({
          to: insertData.phone,
          message: "Bienvenue sur notre réseau WiFi ! Vous êtes maintenant connecté.",
          type: 'welcome'
        });
      }

      await statisticsService.incrementStatistic('total_connections');
      return data;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error; // Re-throw to handle in the component
    }
  },

  async getUserByMac(macAddress: string): Promise<WifiUser | null> {
    try {
      const { data, error } = await supabase
        .from('wifi_users')
        .select()
        .eq('mac_address', macAddress)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user by MAC:", error);
        return null;
      }

      if (data) {
        // Update the last_connection timestamp whenever we retrieve a user by MAC
        await this.updateUser(data.id, { last_connection: new Date().toISOString() });
      }

      return data;
    } catch (error) {
      console.error("Failed to get user by MAC:", error);
      return null;
    }
  },

  async updateUser(userId: string, updateData: Partial<WifiUser>): Promise<WifiUser | null> {
    try {
      const { data, error } = await supabase
        .from('wifi_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating user:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to update user:", error);
      return null;
    }
  }
};
