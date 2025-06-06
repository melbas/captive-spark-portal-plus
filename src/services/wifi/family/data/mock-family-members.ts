
import { FamilyMember } from "../../types";

export const mockFamilyMembers: FamilyMember[] = [
  {
    id: "mem-111111",
    family_id: "fam-123456",
    user_id: "usr-123456",
    name: "Amadou Diop",
    email: "amadou.diop@example.com",
    phone: "+221771234567",
    role: "owner",
    active: true,
    added_at: new Date().toISOString()
  },
  {
    id: "mem-222222",
    family_id: "fam-123456",
    user_id: "usr-234567",
    name: "Fatou Diop",
    email: "fatou.diop@example.com",
    phone: "+221772345678",
    role: "member",
    active: true,
    added_at: new Date().toISOString(),
    last_connection: new Date().toISOString()
  },
  {
    id: "mem-333333",
    family_id: "fam-123456",
    user_id: "usr-345678",
    name: "Omar Diop",
    email: null,
    phone: "+221773456789",
    role: "child",
    active: true,
    added_at: new Date().toISOString(),
    last_connection: new Date(Date.now() - 86400000).toISOString()
  }
];
