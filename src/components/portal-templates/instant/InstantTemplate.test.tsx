/**
 * Tests InstantTemplate — portage production du prototype INSTANT du labo.
 *
 * Contrats vérifiés :
 *  1. La grille affiche les forfaits RÉELS de la DB (getWifiPlans) — plus aucun
 *     data-attribute en dur (data-min/data-price du labo → duration_min /
 *     price_fcfa).
 *  2. Clic sur un forfait PAYANT + paiement → supabase.functions.invoke
 *     ('create-charge') avec le BON planId, siteId et method.
 *  3. Clic sur le forfait GRATUIT (price_fcfa = 0) → rend le composant AuthBox
 *     existant (parcours OTP réutilisé, jamais réinventé).
 */
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const invokeMock = vi.hoisted(() => vi.fn());
const getWifiPlansMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

vi.mock('@/lib/supabase/portalQueries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/portalQueries')>();
  return {
    ...actual,
    getWifiPlans: getWifiPlansMock,
  };
});

// AuthBox est un composant réel avec un parcours OTP complet (tabs, send-otp…).
// Pour ces tests on vérifie qu'il est RENDU sur le chemin gratuit : on le mock
// avec un marqueur identifiable, l'OTP lui-même est couvert par AuthBox.test.tsx.
vi.mock('@/components/AuthBox', () => ({
  default: () => <div data-testid="authbox" />,
}));

vi.mock('@/services/wifi-portal-service', () => ({
  wifiPortalService: {
    createUser: vi.fn(),
    createSession: vi.fn(),
  },
}));

import InstantTemplate from './InstantTemplate';

const SITE_ID = 'site-abc';
const PLANS = [
  {
    id: 'plan-free',
    name: 'Gratuit',
    duration_min: 20,
    price_fcfa: 0,
    speed_down_mb: 5,
    speed_up_mb: 2,
    data_limit_mb: null,
    max_devices: 1,
    is_popular: false,
  },
  {
    id: 'plan-h1',
    name: '1 heure',
    duration_min: 60,
    price_fcfa: 200,
    speed_down_mb: 10,
    speed_up_mb: 5,
    data_limit_mb: null,
    max_devices: 2,
    is_popular: true,
  },
  {
    id: 'plan-d1',
    name: '24 heures',
    duration_min: 1440,
    price_fcfa: 500,
    speed_down_mb: 10,
    speed_up_mb: 5,
    data_limit_mb: null,
    max_devices: 3,
    is_popular: false,
  },
];

beforeEach(() => {
  invokeMock.mockReset();
  getWifiPlansMock.mockReset();
  getWifiPlansMock.mockResolvedValue(PLANS);
});

afterEach(cleanup);

test('affiche les forfaits de la DB (duration_minutes / price_fcfa, pas de data en dur)', async () => {
  render(<InstantTemplate siteId={SITE_ID} />);

  await waitFor(() => expect(getWifiPlansMock).toHaveBeenCalledWith(SITE_ID));

  const grid = await screen.findByTestId('instant-packs');
  expect(grid).toBeTruthy();

  const free = screen.getByTestId('instant-plan-plan-free');
  expect(free.getAttribute('data-plan-id')).toBe('plan-free');
  expect(free.getAttribute('data-duration-minutes')).toBe('20');
  expect(free.getAttribute('data-price-fcfa')).toBe('0');
  expect(free.textContent).toContain('Gratuit');
  expect(free.textContent).toContain('0 F');

  const h1 = screen.getByTestId('instant-plan-plan-h1');
  expect(h1.getAttribute('data-duration-minutes')).toBe('60');
  expect(h1.getAttribute('data-price-fcfa')).toBe('200');
  expect(h1.textContent).toContain('200 F');

  const d1 = screen.getByTestId('instant-plan-plan-d1');
  expect(d1.getAttribute('data-duration-minutes')).toBe('1440');
  expect(d1.getAttribute('data-price-fcfa')).toBe('500');
  expect(d1.textContent).toContain('500 F');

  // Le badge gratuit ne déborde pas : la carte free porte la classe de fix CSS.
  expect(free.className).toContain('free');
});

test('CTA fixe récapitule la sélection, clic payant → invoke create-charge avec le bon planId', async () => {
  const onConnected = vi.fn();
  invokeMock.mockResolvedValue({
    data: { transactionId: 'tx-1', provider: 'bictorys', status: 'pending' },
    error: null,
  });

  render(<InstantTemplate siteId={SITE_ID} onConnected={onConnected} />);

  await screen.findByTestId('instant-packs');

  // Sélection du forfait 1 heure (200 F)
  fireEvent.click(screen.getByTestId('instant-plan-plan-h1'));

  // Le CTA fixe récapitule : durée + prix
  const cta = screen.getByTestId('instant-cta');
  await waitFor(() => expect(cta.textContent).toContain('1 heure'));
  expect(cta.textContent).toContain('200 F');

  fireEvent.click(cta);
  const payButton = await screen.findByTestId('instant-pay-button');
  fireEvent.click(payButton);

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
  const [fnName, payload] = invokeMock.mock.calls[0];
  expect(fnName).toBe('create-charge');
  expect(payload.body.planId).toBe('plan-h1');
  expect(payload.body.siteId).toBe(SITE_ID);
  expect(payload.body.method).toBe('wave_money');

  // Provider sans redirectUrl → accès direct, callback parent notifié
  await waitFor(() => expect(onConnected).toHaveBeenCalled());
  const info = onConnected.mock.calls[0][0];
  expect(info.plan.id).toBe('plan-h1');
  expect(info.amountFcfa).toBe(200);

  // Écran connecté : jauge + horloge
  expect(screen.getByTestId('instant-gauge')).toBeTruthy();
  expect(screen.getByTestId('instant-clock').textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
});

test('clic gratuit → rend AuthBox (parcours OTP réutilisé, pas réinventé)', async () => {
  render(<InstantTemplate siteId={SITE_ID} />);

  await screen.findByTestId('instant-packs');

  // Aucun AuthBox tant qu'aucun forfait gratuit n'est validé
  expect(screen.queryByTestId('authbox')).toBeNull();

  fireEvent.click(screen.getByTestId('instant-plan-plan-free'));

  const cta = screen.getByTestId('instant-cta');
  await waitFor(() => expect(cta.textContent).toContain('Gratuit'));
  fireEvent.click(cta);

  // Le chemin gratuit rend le composant AuthBox EXISTANT — pas d'écran OTP maison
  await screen.findByTestId('authbox');
  expect(screen.queryByTestId('instant-pay-button')).toBeNull();
});

test('erreur getWifiPlans → message fail-closed, pas de grille fantôme', async () => {
  getWifiPlansMock.mockRejectedValue(new Error('RLS refusée'));
  render(<InstantTemplate siteId={SITE_ID} />);

  const err = await screen.findByTestId('instant-error');
  expect(err.textContent).toContain('RLS refusée');
  expect(screen.queryByTestId('instant-packs')).toBeNull();
});
