
import { memberOperations } from "./operations/member-operations";
import { memberQueries } from "./operations/member-queries";

/**
 * Service for managing family members
 * Now refactored into smaller, focused modules
 */
export const familyMemberService = {
  // Member operations
  getFamilyMembers: memberOperations.getFamilyMembers,
  addFamilyMember: memberOperations.addFamilyMember,
  toggleMemberStatus: memberOperations.toggleMemberStatus,
  removeFamilyMember: memberOperations.removeFamilyMember,
  
  // Member queries
  getUserFamilyRole: memberQueries.getUserFamilyRole,
  getUserFamily: memberQueries.getUserFamily
};
