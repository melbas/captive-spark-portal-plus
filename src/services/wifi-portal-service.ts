
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
// NOTE (P0 sécurité) : aucune fonction OTP ici — send-otp/verify-otp sont des
// Edge Functions appelées via supabase.functions.invoke (AuthBox / user-service).
export const wifiPortalService = {
  // User operations (createUser → Edge `verify-otp` quand VITE_USE_EDGE_AUTH)
  createUser: userService.createUser,
  getUserByMac: userService.getUserByMac,
  updateUser: userService.updateUser,
  
  // Session operations
  createSession: sessionService.createSession,
  updateSession: sessionService.updateSession,
  deactivateSession: sessionService.deactivateSession,
  
  // Statistics operations
  incrementStatistic: statisticsService.incrementStatistic,
  
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

// Bouchon e2e (tests Playwright uniquement) : `sessionService` est délibérément
// désactivé (RAPPORT-PORTAIL §6.2), ce qui rend le tunnel démo injoignable en e2e.
// On expose le service agrégé sur `window` SEULEMENT en présence du marqueur e2e,
// pour que le test puisse remplacer `createSession` — aucun effet hors tests.
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e")) {
  (window as unknown as Record<string, unknown>).wifiPortalService = wifiPortalService;
}
