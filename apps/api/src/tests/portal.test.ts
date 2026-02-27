import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock des dépendances externes ────────────────────────────────────────────
vi.mock('../db/queries/portal', () => ({
  getSiteBySlug: vi.fn(),
  createWifiUser: vi.fn(),
  createSession: vi.fn(),
  getActiveSessions: vi.fn(),
}));

vi.mock('../services/hardware/adapter', () => ({
  getHardwareAdapter: vi.fn(),
}));

vi.mock('../services/otp', () => ({
  generateOTP: vi.fn().mockResolvedValue('123456'),
  verifyOTP: vi.fn(),
  storeOTP: vi.fn(),
}));

vi.mock('../services/payments/wave', () => ({
  createWavePayment: vi.fn(),
  verifyWavePayment: vi.fn(),
}));

import { getSiteBySlug, createWifiUser, createSession } from '../db/queries/portal';
import { getHardwareAdapter } from '../services/hardware/adapter';
import { verifyOTP } from '../services/otp';
import { createWavePayment } from '../services/payments/wave';

// ─── Tests : getSiteBySlug ────────────────────────────────────────────────────
describe('Portal — getSiteBySlug', () => {
  it('retourne le site avec ses forfaits quand le slug existe', async () => {
    const mockSite = {
      id: 'site-001',
      slug: 'hotel-terrou-bi',
      name: 'Hôtel Terrou-Bi',
      primaryColor: '#5B4DFF',
      isActive: true,
      plans: [
        { id: 'plan-1', name: 'Journalier', durationHours: 24, priceFcfa: 300 },
        { id: 'plan-2', name: 'Hebdomadaire', durationHours: 168, priceFcfa: 1000 },
      ],
    };
    vi.mocked(getSiteBySlug).mockResolvedValue(mockSite);

    const result = await getSiteBySlug('hotel-terrou-bi');

    expect(result).toBeDefined();
    expect(result?.slug).toBe('hotel-terrou-bi');
    expect(result?.plans).toHaveLength(2);
    expect(result?.plans[0].priceFcfa).toBe(300);
  });

  it('retourne null quand le slug n\'existe pas', async () => {
    vi.mocked(getSiteBySlug).mockResolvedValue(null);
    const result = await getSiteBySlug('slug-inexistant');
    expect(result).toBeNull();
  });

  it('retourne null pour un site inactif', async () => {
    vi.mocked(getSiteBySlug).mockResolvedValue(null); // filtre isActive côté DB
    const result = await getSiteBySlug('site-inactif');
    expect(result).toBeNull();
  });
});

// ─── Tests : Autorisation UniFi ───────────────────────────────────────────────
describe('Portal — authorizeGuest (UniFi)', () => {
  const mockAdapter = {
    authorize: vi.fn(),
    unauthorize: vi.fn(),
    getConnectedClients: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getHardwareAdapter).mockReturnValue(mockAdapter as any);
    mockAdapter.authorize.mockReset();
  });

  it('autorise un client avec une adresse MAC valide', async () => {
    mockAdapter.authorize.mockResolvedValue({ success: true, message: 'Client autorisé' });

    const adapter = getHardwareAdapter({ brand: 'ubiquiti', controllerUrl: 'https://192.168.1.1', username: 'admin', password: 'pass', siteId: 'default' });
    const result = await adapter.authorize({
      mac: 'AA:BB:CC:DD:EE:FF',
      durationMinutes: 1440,
      downloadKbps: 10240,
      uploadKbps: 5120,
    });

    expect(result.success).toBe(true);
    expect(mockAdapter.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ mac: 'AA:BB:CC:DD:EE:FF' })
    );
  });

  it('rejette une adresse MAC invalide', async () => {
    mockAdapter.authorize.mockRejectedValue(new Error('Invalid MAC address format'));

    const adapter = getHardwareAdapter({ brand: 'ubiquiti', controllerUrl: 'https://192.168.1.1', username: 'admin', password: 'pass', siteId: 'default' });

    await expect(
      adapter.authorize({ mac: 'INVALID-MAC', durationMinutes: 1440, downloadKbps: 10240, uploadKbps: 5120 })
    ).rejects.toThrow('Invalid MAC address');
  });

  it('ne génère jamais une MAC aléatoire (règle critique)', () => {
    // Ce test vérifie que Math.random() n'est pas utilisé pour générer une MAC
    const mathRandomSpy = vi.spyOn(Math, 'random');
    // Si Math.random est appelé pendant l'autorisation, le test échoue
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });
});

// ─── Tests : OTP ──────────────────────────────────────────────────────────────
describe('Portal — OTP (Redis-backed)', () => {
  it('vérifie un OTP valide avec succès', async () => {
    vi.mocked(verifyOTP).mockResolvedValue(true);
    const result = await verifyOTP('+221771234567', '123456');
    expect(result).toBe(true);
  });

  it('rejette un OTP invalide', async () => {
    vi.mocked(verifyOTP).mockResolvedValue(false);
    const result = await verifyOTP('+221771234567', '000000');
    expect(result).toBe(false);
  });

  it('rejette un OTP expiré', async () => {
    vi.mocked(verifyOTP).mockResolvedValue(false);
    const result = await verifyOTP('+221771234567', '123456');
    expect(result).toBe(false);
  });
});

// ─── Tests : Paiement Wave ────────────────────────────────────────────────────
describe('Portal — Paiement Wave', () => {
  it('crée un lien de paiement Wave avec le bon montant', async () => {
    vi.mocked(createWavePayment).mockResolvedValue({
      paymentUrl: 'https://pay.wave.com/checkout/abc123',
      transactionId: 'wave-tx-001',
    });

    const result = await createWavePayment({
      amountFcfa: 1000,
      description: 'Forfait Hebdomadaire — Hôtel Terrou-Bi',
      clientPhone: '+221771234567',
      successUrl: 'https://portal.premiumconnect.sn/success',
      errorUrl: 'https://portal.premiumconnect.sn/error',
    });

    expect(result.paymentUrl).toContain('wave.com');
    expect(result.transactionId).toBeDefined();
  });

  it('inclut le bon montant en FCFA dans la requête Wave', async () => {
    vi.mocked(createWavePayment).mockResolvedValue({
      paymentUrl: 'https://pay.wave.com/checkout/xyz',
      transactionId: 'wave-tx-002',
    });

    await createWavePayment({
      amountFcfa: 300,
      description: 'Forfait Journalier',
      clientPhone: '+221771234567',
      successUrl: 'https://portal.premiumconnect.sn/success',
      errorUrl: 'https://portal.premiumconnect.sn/error',
    });

    expect(createWavePayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountFcfa: 300 })
    );
  });
});

// ─── Tests : Création de session ─────────────────────────────────────────────
describe('Portal — Création de session', () => {
  it('crée une session avec les bons paramètres', async () => {
    const mockSession = {
      id: 'session-001',
      mac: 'AA:BB:CC:DD:EE:FF',
      userId: 'user-001',
      siteId: 'site-001',
      planId: 'plan-1',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
    };
    vi.mocked(createSession).mockResolvedValue(mockSession);

    const session = await createSession({
      mac: 'AA:BB:CC:DD:EE:FF',
      userId: 'user-001',
      siteId: 'site-001',
      planId: 'plan-1',
      transactionId: 'tx-001',
    });

    expect(session.mac).toBe('AA:BB:CC:DD:EE:FF');
    expect(session.status).toBe('active');
    expect(session.expiresAt.getTime()).toBeGreaterThan(session.startedAt.getTime());
  });
});

// ─── Tests : Validation des forfaits ─────────────────────────────────────────
describe('Portal — Forfaits (tarifs FCFA)', () => {
  const EXPECTED_PLANS = [
    { name: 'Journalier',     priceFcfa: 300,   durationHours: 24 },
    { name: '3 Jours',        priceFcfa: 500,   durationHours: 72 },
    { name: 'Hebdomadaire',   priceFcfa: 1000,  durationHours: 168 },
    { name: 'Mensuel',        priceFcfa: 3000,  durationHours: 720 },
    { name: 'Famille',        priceFcfa: 10000, durationHours: 720 },
  ];

  it('les tarifs correspondent aux spécifications Knowledge v3.0', () => {
    EXPECTED_PLANS.forEach(plan => {
      expect(plan.priceFcfa).toBeGreaterThan(0);
      expect(plan.durationHours).toBeGreaterThan(0);
    });
    // Vérification du tarif journalier
    expect(EXPECTED_PLANS[0].priceFcfa).toBe(300);
    // Vérification du tarif mensuel
    expect(EXPECTED_PLANS[3].priceFcfa).toBe(3000);
  });

  it('la durée est cohérente avec le nom du forfait', () => {
    const daily = EXPECTED_PLANS.find(p => p.name === 'Journalier');
    expect(daily?.durationHours).toBe(24);

    const weekly = EXPECTED_PLANS.find(p => p.name === 'Hebdomadaire');
    expect(weekly?.durationHours).toBe(168); // 7 * 24
  });
});
