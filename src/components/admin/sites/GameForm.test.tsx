import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const inserted: { table: string; row: unknown }[] = [];

const fromMock = vi.fn((table: string) => ({
  insert: (row: unknown) => {
    inserted.push({ table, row });
    return Promise.resolve({ data: null, error: null });
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import GameForm from './GameForm';

beforeEach(() => {
  inserted.length = 0;
  fromMock.mockClear();
});

afterEach(() => {
  cleanup();
});

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GameForm siteId="site-1" canEdit />
    </QueryClientProvider>,
  );
}

test('la soumission crée un jeu scopé au site', async () => {
  renderForm();

  fireEvent.change(screen.getByLabelText(/titre du jeu/i), {
    target: { value: 'Memory Express' },
  });
  fireEvent.change(screen.getByLabelText(/type de jeu/i), {
    target: { value: 'memory' },
  });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Retrouvez les paires.' },
  });
  fireEvent.change(screen.getByLabelText(/points gagnés/i), {
    target: { value: '25' },
  });
  fireEvent.change(screen.getByLabelText(/minutes gagnées/i), {
    target: { value: '10' },
  });

  fireEvent.click(screen.getByRole('button', { name: /créer le jeu/i }));

  await waitFor(() => {
    expect(fromMock).toHaveBeenCalledWith('games');
  });

  const row = inserted.find((i) => i.table === 'games')?.row as Record<string, unknown>;
  expect(row).toMatchObject({
    site_id: 'site-1',
    title: 'Memory Express',
    game_type: 'memory',
    description: 'Retrouvez les paires.',
    points_reward: 25,
    minutes_reward: 10,
    active: true,
  });
});
