
// WiFi Portal enums and types
export enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS,
  EXTEND_TIME,
  LEAD_GAME
}

export enum EngagementType {
  VIDEO,
  QUIZ
}

export interface UserData {
  id?: string;
  authMethod?: string;
  timeRemainingMinutes?: number;
  engagementData?: any;
  sessionId?: string;
  macAddress?: string | null;
  email?: string;
  phone?: string;
  name?: string;
  leadData?: any;
  [key: string]: any;
}
