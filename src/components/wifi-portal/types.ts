
// Define the steps for the WiFi portal flow
export enum Step {
  AUTH,
  ENGAGEMENT,
  SUCCESS,
  EXTEND_TIME,
  LEAD_GAME
}

// Define the engagement types
export enum EngagementType {
  VIDEO,
  QUIZ
}

// Define the user data structure
export interface UserData {
  id?: string;
  authMethod?: string;
  timeRemainingMinutes?: number;
  engagementData?: any;
  sessionId?: string;
  email?: string;
  phone?: string;
  name?: string;
  macAddress?: string;
  leadData?: any;
  [key: string]: any;
}
