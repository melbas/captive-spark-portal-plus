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

import RewardForm from './RewardForm';

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
      <RewardForm siteId="site-1" canEdit />
    </QueryClientProvider>,
  );
}

test('la soumission crée une récompense scopée au site', async () => {
  renderForm();

  fireEvent.change(screen.getByLabelText(/nom de la récompense/i), {
    target: { value: 'Café offert' },
  });
  fireEvent.change(screen.getByLabelText(/type de récompense/i), {
    target: { value: 'time' },
  });
  fireEvent.change(screen.getByLabelText(/coût en points/i), {
    target: { value: '150' },
  });
  fireEvent.change(screen.getByLabelText(/valeur/i), {
    target: { value: '30 min' },
  });

  fireEvent.click(screen.getByRole('button', { name: /créer la récompense/i }));

  await waitFor(() => {
    expect(fromMock).toHaveBeenCalledWith('rewards');
  });

  const row = inserted.find((i) => i.table === 'rewards')?.row as Record<string, unknown>;
  expect(row).toMatchObject({
    site_id: 'site-1',
    name: 'Café offert',
    reward_type: 'time',
    points_cost: 150,
    value: '30 min',
    active: true,
  });
});
