import type { HardwareAdapter, HardwareConfig, AuthorizeResult, ConnectionTestResult } from './adapter.js';

// ============================================================
// MikroTik Adapter — Phase 2 (stub)
// API : RouterOS REST API /ip/hotspot/active/add
// ou RADIUS CoA (Change of Authorization)
// ============================================================

export class MikrotikAdapter implements HardwareAdapter {
  brand = 'mikrotik' as const;
  private config: HardwareConfig;

  constructor(config: HardwareConfig) {
    this.config = config;
  }

  async authorize(_mac: string, _durationMin: number, _siteId?: string): Promise<AuthorizeResult> {
    // TODO Phase 2 : POST /rest/ip/hotspot/active/add
    // Body: { "mac-address": mac, "server": "hotspot1" }
    // Ou RADIUS CoA via port 3799
    return { success: false, message: 'MikroTik adapter — Phase 2, non encore implémenté' };
  }

  async revoke(_mac: string, _siteId?: string): Promise<AuthorizeResult> {
    // TODO Phase 2 : DELETE /rest/ip/hotspot/active/{id}
    return { success: false, message: 'MikroTik adapter — Phase 2, non encore implémenté' };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // TODO Phase 2 : GET /rest/system/resource
    return { success: false, message: 'MikroTik adapter — Phase 2, non encore implémenté' };
  }
}
