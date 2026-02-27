import axios, { type AxiosInstance } from 'axios';
import https from 'https';
import type { HardwareAdapter, HardwareConfig, AuthorizeResult, ConnectionTestResult } from './adapter.js';

// ============================================================
// UniFi Adapter — Ubiquiti UDM Pro / UniFi Controller
// API : /proxy/network/api/s/{site}/cmd/stamgr
// Docs : https://help.ui.com/hc/en-us/articles/31228198640023
// ============================================================

export class UnifiAdapter implements HardwareAdapter {
  brand = 'ubiquiti' as const;
  private config: HardwareConfig;
  private client: AxiosInstance;
  private cookies: string = '';
  private csrfToken: string = '';

  constructor(config: HardwareConfig) {
    this.config = config;
    // Ignorer les certificats auto-signés (courant sur les UDM Pro locaux)
    this.client = axios.create({
      baseURL: config.controllerUrl,
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      withCredentials: true,
    });
  }

  /**
   * Authentification sur le contrôleur UniFi
   * Retourne les cookies de session et le token CSRF
   */
  private async login(): Promise<void> {
    try {
      const response = await this.client.post('/api/auth/login', {
        username: this.config.username,
        password: this.config.password,
      });

      // Extraire les cookies de session
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map((c: string) => c.split(';')[0]).join('; ');
      }

      // Extraire le token CSRF (X-Csrf-Token ou TOKEN dans le body)
      this.csrfToken = response.headers['x-csrf-token'] ?? response.data?.data?.csrfToken ?? '';

    } catch (err: any) {
      throw new Error(`UniFi login échoué : ${err.message}`);
    }
  }

  /**
   * Autoriser un client WiFi par son adresse MAC
   */
  async authorize(mac: string, durationMin: number, siteId = 'default'): Promise<AuthorizeResult> {
    try {
      await this.login();

      const normalizedMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '').replace(/(.{2})(?=.)/g, '$1:');

      const response = await this.client.post(
        `/proxy/network/api/s/${siteId}/cmd/stamgr`,
        {
          cmd: 'authorize-sta',
          mac: normalizedMac,
          minutes: durationMin,
        },
        {
          headers: {
            Cookie: this.cookies,
            'X-Csrf-Token': this.csrfToken,
            'Content-Type': 'application/json',
          },
        }
      );

      const ok = response.data?.meta?.rc === 'ok';
      return {
        success: ok,
        message: ok ? `MAC ${normalizedMac} autorisé pour ${durationMin} minutes` : response.data?.meta?.msg,
      };

    } catch (err: any) {
      return {
        success: false,
        message: `Erreur UniFi authorize : ${err.message}`,
      };
    }
  }

  /**
   * Révoquer l'accès d'un client WiFi
   */
  async revoke(mac: string, siteId = 'default'): Promise<AuthorizeResult> {
    try {
      await this.login();

      const normalizedMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '').replace(/(.{2})(?=.)/g, '$1:');

      const response = await this.client.post(
        `/proxy/network/api/s/${siteId}/cmd/stamgr`,
        {
          cmd: 'unauthorize-sta',
          mac: normalizedMac,
        },
        {
          headers: {
            Cookie: this.cookies,
            'X-Csrf-Token': this.csrfToken,
            'Content-Type': 'application/json',
          },
        }
      );

      const ok = response.data?.meta?.rc === 'ok';
      return {
        success: ok,
        message: ok ? `MAC ${normalizedMac} révoqué` : response.data?.meta?.msg,
      };

    } catch (err: any) {
      return {
        success: false,
        message: `Erreur UniFi revoke : ${err.message}`,
      };
    }
  }

  /**
   * Tester la connexion au contrôleur
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.login();

      const siteId = this.config.siteId ?? 'default';
      const response = await this.client.get(
        `/proxy/network/api/s/${siteId}/stat/sta`,
        {
          headers: {
            Cookie: this.cookies,
            'X-Csrf-Token': this.csrfToken,
          },
        }
      );

      const clientCount = response.data?.data?.length ?? 0;
      return {
        success: true,
        version: 'UniFi Network',
        clientCount,
        message: `Connexion OK — ${clientCount} clients connectés`,
      };

    } catch (err: any) {
      return {
        success: false,
        message: `Connexion échouée : ${err.message}`,
      };
    }
  }
}
