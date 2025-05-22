
import { 
  WifiUser, 
  WifiSession, 
  PortalStatistic, 
  SMSMessage,
  FamilyProfile,
  FamilyMember,
  FamilyInvite,
  FamilyActivityLog
} from "./wifi/types";
import { userService } from "./wifi/user-service";
import { sessionService } from "./wifi/session-service";
import { statisticsService } from "./wifi/statistics-service";
import { smsService } from "./wifi/sms-service";
import { familyService } from "./wifi/family";

// Re-export all types and services
export type { 
  WifiUser, 
  WifiSession, 
  PortalStatistic, 
  SMSMessage,
  FamilyProfile,
  FamilyMember,
  FamilyInvite,
  FamilyActivityLog
};

// Combined service for backwards compatibility
export const wifiPortalService = {
  // User operations
  createUser: userService.createUser,
  getUserByMac: userService.getUserByMac,
  updateUser: userService.updateUser,
  
  // Session operations
  createSession: sessionService.createSession,
  updateSession: sessionService.updateSession,
  deactivateSession: sessionService.deactivateSession,
  
  // Statistics operations
  incrementStatistic: statisticsService.incrementStatistic,
  
  // SMS services
  sendSMS: smsService.sendSMS,
  generateVerificationCode: smsService.generateVerificationCode,
  sendVerificationCode: smsService.sendVerificationCode,
  verifyCode: smsService.verifyCode,
  
  // Family services
  getFamilyProfiles: familyService.getFamilyProfiles,
  getFamilyProfile: familyService.getFamilyProfile,
  getUserFamily: familyService.getUserFamily,
  createFamilyProfile: familyService.createFamilyProfile,
  updateFamilyProfile: familyService.updateFamilyProfile,
  addFamilyMember: familyService.addFamilyMember,
  getFamilyMembers: familyService.getFamilyMembers,
  toggleMemberStatus: familyService.toggleMemberStatus,
  removeFamilyMember: familyService.removeFamilyMember,
  getUserFamilyRole: familyService.getUserFamilyRole,
  logFamilyActivity: familyService.logFamilyActivity,
  getFamilyActivityLogs: familyService.getFamilyActivityLogs,
  createFamilyInvite: familyService.createFamilyInvite
};
