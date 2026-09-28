import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rows: Record<string, unknown[]> = {
  wifi_plans: [
    { id: 'p1', site_id: 'site-1', name: '1 heure', duration_minutes: 60, price_fcfa: 300, sort_order: 0, is_popular: false, is_active: true },
    { id: 'p2', site_id: 'site-1', name: 'Journée', duration_minutes: 1440, price_fcfa: 1000, sort_order: 1, is_popular: true, is_active: true },
  ],
};

const mutationEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
const chain = {
  select: vi.fn(() => chainEq),
  insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })),
  update: vi.fn(() => ({ eq: mutationEq })),
  delete: vi.fn(() => ({ eq: mutationEq })),
};
const chainEq = {
  eq: vi.fn(() => Promise.resolve({ data: rows.wifi_plans, error: null })),
  select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
};
const fromMock = vi.fn((table: string) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import PlansTab from './PlansTab';

beforeEach(() => {
  fromMock.mockClear();
  chain.select.mockClear();
  chain.insert.mockClear();
  chain.update.mockClear();
  chain.delete.mockClear();
  chainEq.eq.mockClear();
  mutationEq.mockClear();
});

afterEach(() => {
  cleanup();
});

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PlansTab siteId="site-1" canEdit />
    </QueryClientProvider>,
  );
}

test('lists plans sorted by sort_order with the popular badge', async () => {
  renderTab();

  const list = await screen.findByRole('list', { name: /forfaits/i });
  await screen.findByText('Journée'); // les données sont chargées
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('1 heure');
  expect(items[1]).toHaveTextContent('Journée');
  expect(within(items[1]).getByText(/populaire/i)).toBeInTheDocument();
  expect(within(items[0]).queryByText(/populaire/i)).not.toBeInTheDocument();
});

test('moves a plan up and persists the new sort order', async () => {
  renderTab();

  const list = await screen.findByRole('list', { name: /forfaits/i });
  await screen.findByText('Journée'); // les données sont chargées
  const items = within(list).getAllByRole('listitem');
  fireEvent.click(within(items[1]).getByRole('button', { name: /monter/i }));

  await waitFor(() => {
    expect(chain.update).toHaveBeenCalled();
  });
  // « Journée » (2e) passe en position 0, « 1 heure » passe en position 1.
  await waitFor(() => {
    expect(mutationEq).toHaveBeenCalledWith('id', 'p2');
  });
  expect(chain.update).toHaveBeenCalledWith({ sort_order: 0 });
  await waitFor(() => {
    expect(chain.update).toHaveBeenCalledWith({ sort_order: 1 });
  });
  expect(mutationEq).toHaveBeenCalledWith('id', 'p1');
});

test('creates a new plan via the add form', async () => {
  renderTab();

  fireEvent.change(await screen.findByLabelText(/nom du forfait/i), {
    target: { value: 'Semaine' },
  });
  fireEvent.change(screen.getByLabelText(/durée/i), { target: { value: '10080' } });
  fireEvent.change(screen.getByLabelText(/prix/i), { target: { value: '5000' } });
  fireEvent.click(screen.getByRole('button', { name: /^ajouter$/i }));

  await waitFor(() => {
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 'site-1',
        name: 'Semaine',
        duration_minutes: 10080,
        price_fcfa: 5000,
      }),
    );
  });
});

test('toggles the popular badge on a plan', async () => {
  renderTab();

  const list = await screen.findByRole('list', { name: /forfaits/i });
  await screen.findByText('Journée'); // les données sont chargées
  const items = within(list).getAllByRole('listitem');
  fireEvent.click(within(items[0]).getByRole('button', { name: /populaire/i }));

  await waitFor(() => {
    expect(chain.update).toHaveBeenCalledWith({ is_popular: true });
  });
  expect(mutationEq).toHaveBeenCalledWith('id', 'p1');
});

test('deletes a plan', async () => {
  renderTab();

  const list = await screen.findByRole('list', { name: /forfaits/i });
  await screen.findByText('Journée'); // les données sont chargées
  const items = within(list).getAllByRole('listitem');
  fireEvent.click(within(items[1]).getByRole('button', { name: /supprimer/i }));

  await waitFor(() => {
    expect(chain.delete).toHaveBeenCalled();
  });
  expect(mutationEq).toHaveBeenCalledWith('id', 'p2');
});
