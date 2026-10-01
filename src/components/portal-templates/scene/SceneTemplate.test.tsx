/**
 * SceneTemplate — portage du prototype « SCÈNE » (portal-lab #v-scene).
 * On mock AuthBox (le vrai flux OTP est couvert par AuthBox.test.tsx) et on
 * asserte : rendu des props, initiale du sponsor si pas de logo, passage
 * splash → auth → connecté (pass code + jauge).
 */
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/components/AuthBox', () => ({
  default: ({ onAuth }: { onAuth: () => void | Promise<void> }) => (
    <button type="button" data-testid="mock-auth" onClick={() => onAuth()}>
      mock-auth
    </button>
  ),
}));

import SceneTemplate from './SceneTemplate';

afterEach(cleanup);

test('rend le nom de l\'événement, les dates, le lieu et l\'offre', () => {
  render(
    <SceneTemplate
      event_name="Festival Teranga 2026"
      event_dates="19 — 21 Sept."
      event_location="CICAD, Dakar"
      offer_text="Internet gratuit pour les 3 jours du festival"
      sponsor_name="WariTel"
    />,
  );

  expect(screen.getByText('Festival Teranga 2026')).toBeInTheDocument();
  expect(screen.getByText('19 — 21 Sept.')).toBeInTheDocument();
  expect(screen.getByText('CICAD, Dakar')).toBeInTheDocument();
  expect(
    screen.getAllByText('Internet gratuit pour les 3 jours du festival')[0],
  ).toBeInTheDocument();
  expect(screen.getByText('WariTel')).toBeInTheDocument();
});

test('affiche l\'initiale du sponsor dans le carré quand sponsor_logo_url est vide', () => {
  render(<SceneTemplate sponsor_name="WariTel" />);

  const logo = screen.getByText('W');
  expect(logo.className).toContain('logo');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('affiche le logo du sponsor quand sponsor_logo_url est fourni', () => {
  render(<SceneTemplate sponsor_name="WariTel" sponsor_logo_url="https://cdn.example.com/w.png" />);

  const img = screen.getByRole('img', { name: 'WariTel' });
  expect(img.getAttribute('src')).toBe('https://cdn.example.com/w.png');
});

test('le bouton Rejoindre ouvre AuthBox puis la validation affiche l\'écran connecté (pass + jauge)', async () => {
  render(<SceneTemplate event_name="Teranga 2026" siteId="site-1" />);

  fireEvent.click(screen.getByTestId('scene-join'));
  expect(screen.getByTestId('scene-auth')).toBeInTheDocument();

  // Validation OTP (mock) → écran connecté.
  fireEvent.click(screen.getByTestId('mock-auth'));

  expect(screen.getByText(/Connecté au réseau/i)).toBeInTheDocument();
  // Pass journalier au format labo TG-XXXX.
  expect(screen.getByTestId('scene-pass').textContent).toMatch(/^TG-[A-Z2-9]{4}$/);
  // Jauge de temps présente (60 min par défaut).
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  expect(screen.getByTestId('scene-clock').textContent).toBe('60:00');
});
