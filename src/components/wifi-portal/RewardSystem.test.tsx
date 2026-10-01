/**
 * Task 18 — RewardSystem lit les récompenses depuis la table `rewards`
 * (par siteId, migration 2026-09-28-005) au lieu du catalogue hardcodé.
 */
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rewardRows = [
  {
    id: 'rew-db-1',
    name: 'Café Offert',
    description: 'Un café gratuit au comptoir',
    reward_type: 'gift',
    points_cost: 80,
    value: '1',
    active: true,
  },
  {
    id: 'rew-db-2',
    name: '30 Minutes WiFi',
    description: '30 minutes supplémentaires',
    reward_type: 'time',
    points_cost: 100,
    value: '30',
    active: true,
  },
];

const results: Record<string, { data: unknown; error: unknown }> = {
  rewards: { data: rewardRows, error: null },
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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import RewardSystem from './RewardSystem';

afterEach(() => {
  cleanup();
  eqCalls.length = 0;
});

const userData = {
  timeRemainingMinutes: 30,
  points: 200,
};

function renderRewards() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RewardSystem
        userData={userData as any}
        onBack={() => {}}
        onRedeem={() => {}}
        siteId="site-1"
      />
    </QueryClientProvider>,
  );
}

test('affiche les récompenses lues depuis la table rewards', async () => {
  renderRewards();
  expect(await screen.findByText('Café Offert')).toBeInTheDocument();
  expect(screen.getByText('30 Minutes WiFi')).toBeInTheDocument();
  // La requête est scopée par site et limitée aux actives.
  expect(eqCalls).toEqual(
    expect.arrayContaining([
      { column: 'site_id', value: 'site-1' },
      { column: 'active', value: true },
    ]),
  );
});

test("n'affiche plus le catalogue hardcodé (ex: 'Accès Premium', 'Réduction 10%')", async () => {
  renderRewards();
  await screen.findByText('Café Offert');
  expect(screen.queryByText('Accès Premium')).not.toBeInTheDocument();
  expect(screen.queryByText('Réduction 10%')).not.toBeInTheDocument();
  expect(screen.queryByText('1 Heure WiFi')).not.toBeInTheDocument();
});
