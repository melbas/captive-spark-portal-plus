
import { FamilyRole } from "@/components/wifi-portal/types";

export interface FamilyMemberServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AddMemberData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface FamilyMemberOperationResult {
  memberId: string;
  familyId: string;
  action: string;
  timestamp: string;
}
