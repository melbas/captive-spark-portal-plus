import type { HardwareAdapter, HardwareConfig, AuthorizeResult, ConnectionTestResult } from './adapter.js';

// Cisco ISE / WLC — Phase 3
export class CiscoAdapter implements HardwareAdapter {
  brand = 'cisco' as const;
  constructor(private config: HardwareConfig) {}
  async authorize(_mac: string, _durationMin: number): Promise<AuthorizeResult> {
    return { success: false, message: 'Cisco adapter — Phase 3, non encore implémenté' };
  }
  async revoke(_mac: string): Promise<AuthorizeResult> {
    return { success: false, message: 'Cisco adapter — Phase 3, non encore implémenté' };
  }
  async testConnection(): Promise<ConnectionTestResult> {
    return { success: false, message: 'Cisco adapter — Phase 3, non encore implémenté' };
  }
}
