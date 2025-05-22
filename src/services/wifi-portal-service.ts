
import { WifiUser, WifiSession, PortalStatistic, SMSMessage } from "./wifi/types";
import { userService } from "./wifi/user-service";
import { sessionService } from "./wifi/session-service";
import { statisticsService } from "./wifi/statistics-service";
import { smsService } from "./wifi/sms-service";
import { familyService } from "./wifi/family-service";
import { radiusService } from "./wifi/radius-service";

// Re-export all types and services
export type { 
  WifiUser, 
  WifiSession, 
  PortalStatistic, 
  SMSMessage 
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
  addFamilyMember: familyService.addFamilyMember,
  removeFamilyMember: familyService.removeFamilyMember,
  updateFamilyMember: familyService.updateFamilyMember,
  getUserFamilyRole: familyService.getUserFamilyRole,

  // RADIUS services
  getRadiusClients: radiusService.getClients,
  getRadiusClient: radiusService.getClient,
  createRadiusClient: radiusService.createClient,
  updateRadiusClient: radiusService.updateClient,
  deleteRadiusClient: radiusService.deleteClient,
  getRadiusAuthLogs: radiusService.getAuthLogs,
  getRadiusAccountingLogs: radiusService.getAccountingLogs
};
