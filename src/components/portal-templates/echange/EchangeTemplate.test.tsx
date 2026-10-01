/**
 * Tests EchangeTemplate — portage du prototype #v-echange.
 * Couvre le contrat demandé :
 * 1. le board affiche 4 missions,
 * 2. faire le quiz crédite +10 min sur la jauge,
 * 3. CTA bloqué avant 1 mission puis débloqué.
 */
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// ---- Mocks backend (aucun réseau) ----

const chain = () => {
  // Aucune ligne DB : quiz → fallback config module ; ads → [].
  const p = Promise.resolve({ data: [], error: null });
  const c = {
    select: () => c,
    eq: () => c,
    order: () => c,
    single: () => p,
    maybeSingle: () => p,
    then: (res: unknown, rej: unknown) => p.then(res as never, rej as never),
  };
  return c;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => chain(), functions: { invoke: vi.fn() } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const createUserMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/wifi-portal-service', () => ({
  wifiPortalService: {
    createUser: (...args: unknown[]) => createUserMock(...args),
    createSession: (...args: unknown[]) => createSessionMock(...args),
    updateSession: vi.fn(),
  },
}));

vi.mock('@/components/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'fr' }),
}));

// Matchers jest-dom (@testing-library/jest-dom/vitest) pour TS.
import '@testing-library/jest-dom/vitest';

import EchangeTemplate from './EchangeTemplate';

/**
 * Sous les fake timers, React 19 planifie les re-rendus en microtasks :
 * on draine plusieurs ticks jusqu'à ce que `probe` passe (requis pour les
 * chaînes de promesses quiz/ad → setState).
 */
async function flushUntil(probe: () => boolean, maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    await vi.advanceTimersByTimeAsync(1);
    if (probe()) return;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  createUserMock.mockReset();
  createSessionMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

function renderTemplate(props = {}) {
  return render(<EchangeTemplate {...props} />);
}

test('affiche les 4 missions du prototype', () => {
  renderTemplate();
  const board = screen.getByTestId('missions-board');
  const missions = board.querySelectorAll('.ec2-mission');
  expect(missions.length).toBe(4);
  expect(board.querySelector('[data-kind="quiz"]')).not.toBeNull();
  expect(board.querySelector('[data-kind="sponsor"]')).not.toBeNull();
  expect(board.querySelector('[data-kind="ref"]')).not.toBeNull();
  expect(board.querySelector('[data-kind="havecode"]')).not.toBeNull();
});

test('la jauge démarre à 0 min et le CTA est verrouillé avant 1 mission', () => {
  renderTemplate();
  expect(screen.getByTestId('ec-num')).toHaveTextContent(/^0/);
  expect(screen.getByTestId('ec-go')).toBeDisabled();
  expect(screen.getByTestId('ec-state-txt')).toHaveTextContent(
    'Fais 1 mission pour débloquer internet',
  );
});

test('faire le quiz crédite +10 min sur la jauge', async () => {
  renderTemplate();
  // Ouvre la mission quiz.
  fireEvent.click(document.querySelector('[data-kind="quiz"]')!);
  expect(screen.getByTestId('mission-runner')).toBeInTheDocument();

  // Q1 — la bonne réponse est la première option du fallback ("Contacter ma famille").
  // Fake timers : draine les microtasks (requête quiz → fallback) sans waitFor.
  await flushUntil(() => screen.queryByText('Pourquoi tu te connectes au WiFi ?') !== null);
  expect(screen.getByText('Pourquoi tu te connectes au WiFi ?')).toBeInTheDocument();
  const answer = () => {
    const opts = screen.getAllByTestId('quiz-option');
    fireEvent.click(opts[0]);
  };
  answer();

  // 750ms → Q2, puis drain du re-render React sous fake timers.
  await vi.advanceTimersByTimeAsync(750);
  await flushUntil(
    () => screen.queryByText('Quel partenaire finance ton WiFi ?') !== null,
  );
  answer();

  // 650ms fin de quiz → award (+10 min sur la jauge).
  await vi.advanceTimersByTimeAsync(700);
  await flushUntil(() => /^10/.test(screen.getByTestId('ec-num').textContent || 'x'));

  expect(screen.getByTestId('ec-num')).toHaveTextContent(/^10/);
  // Mission marquée faite sur le board.
  expect(document.querySelector('[data-kind="quiz"]')).toHaveAttribute('data-done', 'true');
});

test('le CTA se débloque après 1 mission et lance la connexion (AuthBox + session = minutes gagnées)', async () => {
  createUserMock.mockResolvedValue({ id: 'user-1', auth_method: 'sms', phone: '+221770000000' });
  createSessionMock.mockResolvedValue({
    id: 'sess-1',
    user_id: 'user-1',
    duration_minutes: 10,
  });

  renderTemplate();
  expect(screen.getByTestId('ec-go')).toBeDisabled();

  // Termine le quiz (même séquence que le test précédent).
  fireEvent.click(document.querySelector('[data-kind="quiz"]')!);
  await flushUntil(() => screen.queryByText('Pourquoi tu te connectes au WiFi ?') !== null);
  const answer = () => fireEvent.click(screen.getAllByTestId('quiz-option')[0]);
  answer();
  await vi.advanceTimersByTimeAsync(750);
  await flushUntil(() => screen.queryByText('Quel partenaire finance ton WiFi ?') !== null);
  answer();
  await vi.advanceTimersByTimeAsync(700);
  await flushUntil(() => /^10/.test(screen.getByTestId('ec-num').textContent || 'x'));

  expect(screen.getByTestId('ec-go')).toBeEnabled();
  expect(screen.getByTestId('ec-go')).toHaveTextContent('Se connecter · 10 min');

  // AuthBox affichée (identification SMS légale obligatoire même en gratuit).
  expect(screen.getByTestId('ec-auth')).toBeInTheDocument();
});

test('objectif paramétrable via la prop goalMinutes', () => {
  renderTemplate({ goalMinutes: 60 });
  expect(screen.getByText('60 min')).toBeInTheDocument();
});
