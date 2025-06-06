
import { FamilyRole } from "@/components/wifi-portal/types";

/**
 * Maps FamilyRole enum to database string role
 */
export const mapRoleToDbRole = (role: FamilyRole): string => {
  switch (role) {
    case FamilyRole.OWNER:
      return "owner";
    case FamilyRole.MEMBER:
      return "member";
    case FamilyRole.CHILD:
      return "child";
    default:
      return "member";
  }
};

/**
 * Maps database string role to FamilyRole enum
 */
export const mapDbRoleToRole = (dbRole: string): FamilyRole | null => {
  switch (dbRole) {
    case "owner":
      return FamilyRole.OWNER;
    case "member":
      return FamilyRole.MEMBER;
    case "child":
      return FamilyRole.CHILD;
    default:
      return null;
  }
};

/**
 * Generates a unique member ID
 */
export const generateMemberId = (): string => {
  return `mem-${Math.random().toString(36).substring(2, 8)}`;
};

/**
 * Validates if a user can be added to a family
 */
export const validateMemberAddition = (
  existingMembers: any[],
  familyId: string,
  userId: string,
  maxMembers: number
): { valid: boolean; error?: string } => {
  // Check if family is at capacity
  if (existingMembers.filter(m => m.family_id === familyId).length >= maxMembers) {
    return { valid: false, error: "Family is at maximum capacity" };
  }

  // Check if user is already a member
  const existingMember = existingMembers.find(m => m.family_id === familyId && m.user_id === userId);
  if (existingMember) {
    return { valid: false, error: "User is already a member of this family" };
  }

  return { valid: true };
};
