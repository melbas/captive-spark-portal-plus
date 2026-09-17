import type { WifiSession } from './types';

/**
 * Integration gate: the visitor-session API is not yet validated.
 * Never fall back to anonymous database writes or fabricate an authorization.
 * These failures are intentional and must not be deployed as a working journey.
 * Replace this gate only with a tested, site-bound server authorization contract.
 */
export const sessionService = {
  async createSession(_sessionData: WifiSession): Promise<WifiSession | null> {
    return null;
  },
  async updateSession(_sessionId: string, _updateData: Partial<WifiSession>): Promise<WifiSession | null> {
    return null;
  },
  async deactivateSession(_sessionId: string): Promise<boolean> {
    return false;
  },
};
