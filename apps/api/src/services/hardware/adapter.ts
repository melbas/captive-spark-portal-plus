// ============================================================
// PremiumConnect — Interface HardwareAdapter
// Pattern Plugin : chaque marque implémente cette interface
// Ajouter une nouvelle marque = créer un fichier de ~80 lignes
// ============================================================

export type HardwareBrand = 'ubiquiti' | 'mikrotik' | 'cisco' | 'huawei' | 'tplink';

export interface AuthorizeResult {
  success: boolean;
  message?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  clientCount?: number;
  message?: string;
}

export interface HardwareAdapter {
  brand: HardwareBrand;
  /**
   * Autoriser un client WiFi par son adresse MAC
   * @param mac - Adresse MAC au format xx:xx:xx:xx:xx:xx (minuscules)
   * @param durationMin - Durée d'accès en minutes
   * @param siteId - Identifiant du site sur le contrôleur (ex: "default" pour UniFi)
   */
  authorize(mac: string, durationMin: number, siteId?: string): Promise<AuthorizeResult>;
  /**
   * Révoquer l'accès d'un client WiFi
   */
  revoke(mac: string, siteId?: string): Promise<AuthorizeResult>;
  /**
   * Tester la connexion au contrôleur
   */
  testConnection(): Promise<ConnectionTestResult>;
}

export interface HardwareConfig {
  brand: HardwareBrand;
  controllerUrl: string;
  username: string;
  password: string;
  siteId?: string;
}

/**
 * Factory : retourne l'adaptateur correspondant à la marque
 */
export async function createAdapter(config: HardwareConfig): Promise<HardwareAdapter> {
  switch (config.brand) {
    case 'ubiquiti': {
      const { UnifiAdapter } = await import('./unifi.js');
      return new UnifiAdapter(config);
    }
    case 'mikrotik': {
      const { MikrotikAdapter } = await import('./mikrotik.js');
      return new MikrotikAdapter(config);
    }
    case 'cisco': {
      const { CiscoAdapter } = await import('./cisco.js');
      return new CiscoAdapter(config);
    }
    case 'huawei': {
      const { HuaweiAdapter } = await import('./huawei.js');
      return new HuaweiAdapter(config);
    }
    default:
      throw new Error(`Adaptateur hardware non supporté : ${config.brand}`);
  }
}
