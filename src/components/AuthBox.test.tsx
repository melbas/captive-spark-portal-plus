/**
 * P0-A — L'OTP du portail passe par les Edge Functions Supabase.
 * AuthBox doit appeler `send-otp` via supabase.functions.invoke et ne doit
 * JAMAIS stocker ni comparer de code OTP côté client (vérification = verify-otp
 * côté serveur, via user-service.createUser).
 */
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'fr' }),
}));

import AuthBox from './AuthBox';

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: { success: true, expiresIn: 300 }, error: null });
  localStorage.clear();
});

afterEach(cleanup);

test('RED: appelle send-otp Edge avec { phone, siteId } pour le chemin SMS', async () => {
  render(<AuthBox onAuth={vi.fn()} />);

  fireEvent.change(screen.getByLabelText('phoneNumber'), { target: { value: '771234567' } });
  fireEvent.click(screen.getByRole('button', { name: /sendCode/ }));

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('send-otp', {
      body: { phone: '+221771234567', siteId: 'demo-site' },
    });
  });
  expect(invokeMock).toHaveBeenCalledTimes(1);
});

test('RED: appelle send-otp Edge avec { email, siteId } pour le chemin email', async () => {
  render(<AuthBox onAuth={vi.fn()} />);

  const emailTab = screen.getByRole('tab', { name: 'Email' });
  fireEvent.mouseDown(emailTab);
  fireEvent.click(emailTab);
  await waitFor(() => expect(screen.getByLabelText('emailAddress')).toBeTruthy());
  fireEvent.change(screen.getByLabelText('emailAddress'), { target: { value: 'user@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /sendCode/ }));

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith('send-otp', {
      body: { email: 'user@example.com', siteId: 'demo-site' },
    });
  });
});

test('RED: aucun code OTP ne fuit dans state / localStorage', async () => {
  // L'Edge Function ne renvoie PAS de code (sauf devCode en mode démo serveur).
  invokeMock.mockResolvedValue({ data: { success: true, devMode: true, devCode: '999888' }, error: null });

  const { container } = render(<AuthBox onAuth={vi.fn()} />);

  fireEvent.change(screen.getByLabelText('phoneNumber'), { target: { value: '771234567' } });
  fireEvent.click(screen.getByRole('button', { name: /sendCode/ }));

  await waitFor(() => expect(invokeMock).toHaveBeenCalled());

  // Aucun code renvoyé par l'Edge n'est stocké côté front.
  expect(container.textContent).not.toContain('999888');
  for (let i = 0; i < localStorage.length; i++) {
    expect(localStorage.getItem(localStorage.key(i)!)).not.toContain('999888');
  }
});

test('RED: échec send-otp → pas de passage à l’écran OTP (fail-closed)', async () => {
  invokeMock.mockResolvedValue({ data: null, error: { message: 'Trop de codes envoyés' } });

  render(<AuthBox onAuth={vi.fn()} />);

  fireEvent.change(screen.getByLabelText('phoneNumber'), { target: { value: '771234567' } });
  fireEvent.click(screen.getByRole('button', { name: /sendCode/ }));

  await waitFor(() => expect(screen.getByText('errorSendingCode')).toBeTruthy());
  // L'écran de saisie OTP ne doit PAS être affiché.
  expect(screen.queryByRole('button', { name: /verify/i })).toBeNull();
});

test('RED: verifyCode / sendVerificationCode ne sont plus exposés par wifiPortalService', async () => {
  const mod = await import('@/services/wifi-portal-service');
  expect((mod.wifiPortalService as Record<string, unknown>).verifyCode).toBeUndefined();
  expect((mod.wifiPortalService as Record<string, unknown>).sendVerificationCode).toBeUndefined();
  expect((mod.wifiPortalService as Record<string, unknown>).generateVerificationCode).toBeUndefined();
});
