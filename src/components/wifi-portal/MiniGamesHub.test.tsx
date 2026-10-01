/**
 * Task 18 — MiniGamesHub lit les jeux depuis la table `games` (par siteId,
 * migration 2026-09-28-005) au lieu des 4 jeux hardcodés.
 */
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const gameRows = [
  {
    id: 'game-db-1',
    title: 'Memory Express',
    game_type: 'memory',
    description: 'Retrouvez les paires le plus vite possible',
    points_reward: 40,
    minutes_reward: 8,
    category: 'cognitive',
    active: true,
  },
  {
    id: 'game-db-2',
    title: 'Quiz Client',
    game_type: 'quiz',
    description: 'Testez vos connaissances',
    points_reward: 30,
    minutes_reward: 6,
    category: 'educational',
    active: true,
  },
];

const results: Record<string, { data: unknown; error: unknown }> = {
  games: { data: gameRows, error: null },
};

const eqCalls: { column: string; value: unknown }[] = [];

function chainFor(name: string) {
  const p = Promise.resolve(results[name] ?? { data: [], error: null });
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      eqCalls.push({ column, value });
      return chain;
    },
    order: () => chain,
    single: () => p,
    maybeSingle: () => p,
    then: (
      res: (v: { data: unknown; error: unknown }) => unknown,
      rej: (e: unknown) => unknown,
    ) => p.then(res, rej),
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => chainFor(t) },
}));

// analyticsService : localStorage + stats RPC — on neutralise les effets.
vi.mock('@/services/analytics-service', () => ({
  analyticsService: {
    startGameSession: vi.fn(),
    getSessionDuration: vi.fn(() => 0),
    trackGameEvent: vi.fn(async () => true),
  },
}));

import MiniGamesHub from './MiniGamesHub';

afterEach(() => {
  cleanup();
  eqCalls.length = 0;
});

const userData = {
  timeRemainingMinutes: 30,
  points: 100,
};

function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MiniGamesHub
        userData={userData as any}
        onBack={() => {}}
        onGameComplete={() => {}}
        siteId="site-1"
      />
    </QueryClientProvider>,
  );
}

test('affiche les jeux lus depuis la table games', async () => {
  renderHub();
  expect(await screen.findByText('Memory Express')).toBeInTheDocument();
  expect(screen.getByText('Quiz Client')).toBeInTheDocument();
});

test("n'affiche plus les jeux hardcodés (ex: 'Jeu de Mémoire', 'Tap Challenge')", async () => {
  renderHub();
  await screen.findByText('Memory Express');
  expect(screen.queryByText('Jeu de Mémoire')).not.toBeInTheDocument();
  expect(screen.queryByText('Tap Challenge')).not.toBeInTheDocument();
  expect(screen.queryByText('Puzzle Glissant')).not.toBeInTheDocument();
});

test('interroge la table games scopée par site (site_id + active)', async () => {
  renderHub();
  await screen.findByText('Memory Express');
  expect(eqCalls).toEqual(
    expect.arrayContaining([
      { column: 'site_id', value: 'site-1' },
      { column: 'active', value: true },
    ]),
  );
});
