import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface WifiUser {
  id?: string;
  auth_method: string;
  email?: string;
  phone?: string;
  name?: string;
  mac_address?: string;
}

export interface WifiSession {
  id?: string;
  user_id: string;
  duration_minutes: number;
  engagement_type?: string;
  engagement_data?: any;
  is_active?: boolean;
}

export interface PortalStatistic {
  total_connections: number;
  video_views: number;
  quiz_completions: number;
  games_played: number;
  leads_collected: number;
}

export interface SMSMessage {
  to: string;
  message: string;
  type?: 'verification' | 'welcome' | 'notification';
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface SMSVerification {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

// Store verification codes in memory (in a production environment, this would be in a database)
const verificationCodes: SMSVerification[] = [];

export const wifiPortalService = {
  // User operations
  async createUser(userData: WifiUser): Promise<WifiUser | null> {
    try {
      // If no ID provided, generate one
      if (!userData.id) {
        userData.id = uuidv4();
      }
      
      const { data, error } = await supabase
        .from('wifi_users')
        .insert(userData)
        .select()
        .single();
      
      if (error) {
        console.error("Error creating user:", error);
        throw error; // Throw error for better handling in UI
      }
      
      // Send welcome SMS if phone number is provided
      if (userData.phone && userData.auth_method === 'sms') {
        await this.sendSMS({
          to: userData.phone,
          message: "Bienvenue sur notre réseau WiFi ! Vous êtes maintenant connecté.",
          type: 'welcome'
        });
      }
      
      await this.incrementStatistic('total_connections');
      return data;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error; // Re-throw to handle in the component
    }
  },
  
  // SMS service
  async sendSMS(smsData: SMSMessage): Promise<boolean> {
    try {
      console.log(`Sending SMS to ${smsData.to}: ${smsData.message}`);
      
      // Store SMS in database for tracking (in a real implementation)
      // For now, we'll just log it and simulate success/failure
      const success = Math.random() > 0.1; // 90% success rate for simulation
      
      if (!success) {
        console.error(`Failed to send SMS to ${smsData.to}`);
        return false;
      }
      
      // In a real implementation, this would call an SMS API
      // Example integration with an SMS API (commented out):
      // const response = await fetch('https://your-sms-api.com/send', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${YOUR_SMS_API_KEY}`
      //   },
      //   body: JSON.stringify({
      //     to: smsData.to,
      //     message: smsData.message
      //   })
      // });
      
      // Track SMS sent in statistics (you might want to add this column to your statistics table)
      // await this.incrementStatistic('sms_sent');
      
      return true;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return false;
    }
  },
  
  generateVerificationCode(): string {
    // Generate a random 4-digit code
    return Math.floor(1000 + Math.random() * 9000).toString();
  },
  
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; code: string }> {
    try {
      // Remove any existing verification code for this number
      const index = verificationCodes.findIndex(v => v.phoneNumber === phoneNumber);
      if (index !== -1) {
        verificationCodes.splice(index, 1);
      }
      
      // Generate a new verification code
      const code = this.generateVerificationCode();
      
      // Store the verification code with expiration (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      
      verificationCodes.push({
        phoneNumber,
        code,
        expiresAt,
        attempts: 0
      });
      
      // Send the verification SMS
      const message = `Votre code de vérification est: ${code}. Valable pendant 15 minutes.`;
      const sent = await this.sendSMS({
        to: phoneNumber,
        message,
        type: 'verification'
      });
      
      return { 
        success: sent,
        code // Return the code for development purposes only
      };
    } catch (error) {
      console.error("Error sending verification code:", error);
      return { 
        success: false,
        code: ''
      };
    }
  },
  
  verifyCode(phoneNumber: string, code: string): boolean {
    // Find the verification record
    const index = verificationCodes.findIndex(v => v.phoneNumber === phoneNumber);
    
    if (index === -1) {
      console.error("No verification code found for this number");
      return false;
    }
    
    const verification = verificationCodes[index];
    
    // Check if the code has expired
    if (new Date() > verification.expiresAt) {
      // Remove expired code
      verificationCodes.splice(index, 1);
      console.error("Verification code has expired");
      return false;
    }
    
    // Increment attempt count
    verification.attempts += 1;
    
    // Check if max attempts reached (3 attempts)
    if (verification.attempts > 3) {
      // Remove the verification record
      verificationCodes.splice(index, 1);
      console.error("Max verification attempts reached");
      return false;
    }
    
    // Check if the code matches
    if (verification.code === code) {
      // Remove the verification record on success
      verificationCodes.splice(index, 1);
      return true;
    }
    
    return false;
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
  },
  
  // Session operations
  async createSession(sessionData: WifiSession): Promise<WifiSession | null> {
    try {
      // If no ID provided, generate one
      if (!sessionData.id) {
        sessionData.id = uuidv4();
      }

      const { data, error } = await supabase
        .from('wifi_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) {
        console.error("Error creating session:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  },
  
  async updateSession(sessionId: string, updateData: Partial<WifiSession>): Promise<WifiSession | null> {
    try {
      const { data, error } = await supabase
        .from('wifi_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating session:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Failed to update session:", error);
      return null;
    }
  },
  
  async deactivateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wifi_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error deactivating session:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to deactivate session:", error);
      return false;
    }
  },
  
  // Statistics operations
  async incrementStatistic(field: keyof PortalStatistic): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to get today's record
      const { data: existingRecord } = await supabase
        .from('portal_statistics')
        .select()
        .eq('date', today)
        .maybeSingle();
      
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('portal_statistics')
          .update({ [field]: existingRecord[field] + 1 })
          .eq('id', existingRecord.id);
        
        if (error) {
          console.error(`Error incrementing ${field}:`, error);
          return false;
        }
        
        return true;
      } else {
        // Create new record for today with incremented field
        const newRecord: Record<string, any> = {
          date: today,
          total_connections: 0,
          video_views: 0,
          quiz_completions: 0,
          games_played: 0,
          leads_collected: 0
        };
        
        newRecord[field] = 1;
        
        const { error } = await supabase
          .from('portal_statistics')
          .insert(newRecord);
        
        if (error) {
          console.error(`Error creating statistic record for ${field}:`, error);
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error(`Failed to increment statistic ${field}:`, error);
      return false;
    }
  }
};
