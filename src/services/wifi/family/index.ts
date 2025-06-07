
import { familyProfileService } from './family-profile-service';
import { familyMemberService } from './family-member-service';
import { familyActivityService } from './family-activity-service';
import { familyInviteService } from './family-invite-service';
import { familyChangeService } from './family-change-service';
import { FamilyRole } from '@/components/wifi-portal/types';

/**
 * Combined service for family-related operations
 */
export const familyService = {
  // Re-export from profile service
  getFamilyProfiles: familyProfileService.getFamilyProfiles,
  getFamilyProfile: familyProfileService.getFamilyProfile,
  createFamilyProfile: familyProfileService.createFamilyProfile,
  updateFamilyProfile: familyProfileService.updateFamilyProfile,
  
  // Re-export from member service
  getFamilyMembers: familyMemberService.getFamilyMembers,
  addFamilyMember: familyMemberService.addFamilyMember,
  toggleMemberStatus: familyMemberService.toggleMemberStatus,
  removeFamilyMember: familyMemberService.removeFamilyMember,
  getUserFamilyRole: familyMemberService.getUserFamilyRole,
  getUserFamily: familyMemberService.getUserFamily,
  
  // Re-export from activity service
  logFamilyActivity: familyActivityService.logFamilyActivity,
  getFamilyActivityLogs: familyActivityService.getFamilyActivityLogs,
  
  // Re-export from invite service
  createFamilyInvite: familyInviteService.createFamilyInvite,
  getPendingInvites: familyInviteService.getPendingInvites,
  
  // Re-export from change service
  validateFamilyChange: familyChangeService.validateFamilyChange,
  logFamilyChange: familyChangeService.logFamilyChange,
  getFamilyChangeHistory: familyChangeService.getFamilyChangeHistory,
  resetMonthlyChangesIfNeeded: familyChangeService.resetMonthlyChangesIfNeeded,
  getUserChangeStats: familyChangeService.getUserChangeStats,
};
