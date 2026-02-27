import type { HardwareAdapter, HardwareConfig, AuthorizeResult, ConnectionTestResult } from './adapter.js';

// Huawei AC / eSight — Phase 3
export class HuaweiAdapter implements HardwareAdapter {
  brand = 'huawei' as const;
  constructor(private config: HardwareConfig) {}
  async authorize(_mac: string, _durationMin: number): Promise<AuthorizeResult> {
    return { success: false, message: 'Huawei adapter — Phase 3, non encore implémenté' };
  }
  async revoke(_mac: string): Promise<AuthorizeResult> {
    return { success: false, message: 'Huawei adapter — Phase 3, non encore implémenté' };
  }
  async testConnection(): Promise<ConnectionTestResult> {
    return { success: false, message: 'Huawei adapter — Phase 3, non encore implémenté' };
  }
}
