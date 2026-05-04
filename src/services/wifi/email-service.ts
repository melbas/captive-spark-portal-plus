import { EmailMessage } from './types';

export const emailService = {
  async sendEmail(emailData: EmailMessage): Promise<boolean> {
    try {
      console.log(`Sending email to ${emailData.to}: ${emailData.subject}`);
      const success = Math.random() > 0.1; // simulate 90% success
      if (!success) {
        console.error(`Failed to send email to ${emailData.to}`);
        return false;
      }
      // In a real implementation, integrate with an email provider here
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }
};
