
import { SMSMessage, SMSVerification } from "./types";

// Store verification codes in memory (in a production environment, this would be in a database)
const verificationCodes: SMSVerification[] = [];

export const smsService = {
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
  }
};
