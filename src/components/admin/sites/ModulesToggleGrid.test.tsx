/**
 * Task 12 : ModulesToggleGrid
 * Rend la grille avec siteId, bascule un module, vérifie la mutation.
 */
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mock Supabase : noeud chaînable ET thenable (await → { data }) ---
interface Cell { maybe: { id: string } | null }

const makeChain = (
  resolveData: unknown,
  cell: Cell,
) => {
  const store = { inserts: [] as any[], updates: [] as any[] };
  const build = (): any => {
    const n: any = {
      select: vi.fn(() => n),
      eq: vi.fn(() => n),
      order: vi.fn(() => n),
      limit: vi.fn(() => n),
      maybeSingle: vi.fn(async () => ({ data: cell.maybe, error: null })),
      single: vi.fn(async () => ({ data: null, error: null })),
      insert: vi.fn(async (p: any) => { store.inserts.push(p); return n; }),
      update: vi.fn((p: any) => { store.updates.push(p); return n; }),
      upsert: vi.fn(async (p: any) => { store.updates.push(p); return n; }),
      then: (res: any, rej: any) =>
        Promise.resolve({ data: resolveData, error: null }).then(res, rej),
    };
    return n;
  };
  return { node: build(), store };
};

const cell: Cell = { maybe: null };
const catalogueMock = makeChain(
  [
    { id: 'mod-1', module_name: 'quiz', display_name: 'Quiz', description: null, category: 'engagement' },
    { id: 'mod-2', module_name: 'payment', display_name: 'Paiement', description: null, category: 'business' },
  ],
  cell,
);
const configMock = makeChain(null, { ...cell, maybe: { id: 'cfg-1' } });
const enabledMock = makeChain([{ module_id: 'mod-1', is_enabled: true }], cell);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) =>
      table === 'portal_modules' ? catalogueMock.node
        : table === 'portal_config' ? configMock.node
        : enabledMock.node,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ModulesToggleGrid from './ModulesToggleGrid';

beforeEach(() => {
  cell.maybe = null;
  enabledMock.store.inserts.length = 0;
  enabledMock.store.updates.length = 0;
});

afterEach(cleanup);

function renderGrid(siteId = 'site-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ModulesToggleGrid siteId={siteId} />
    </QueryClientProvider>,
  );
}

test('affiche le catalogue et reflète l état activé du site', async () => {
  renderGrid();
  expect(await screen.findByText('Quiz')).toBeInTheDocument();
  expect(screen.getByText('Paiement')).toBeInTheDocument();
  const quizSwitch = screen.getByRole('switch', { name: /activer quiz/i });
  expect(quizSwitch).toBeChecked();
  expect(screen.getByRole('switch', { name: /activer paiement/i })).not.toBeChecked();
});

test('bascule un module non activé → insert via le portal_config du site', async () => {
  renderGrid('site-1');
  const paiementSwitch = await screen.findByRole('switch', { name: /activer paiement/i });
  fireEvent.click(paiementSwitch);
  await waitFor(() => {
    expect(enabledMock.store.inserts).toHaveLength(1);
  });
  expect(enabledMock.store.inserts[0]).toEqual(
    expect.objectContaining({
      portal_config_id: 'cfg-1',
      module_id: 'mod-2',
      is_enabled: true,
    }),
  );
  expect(enabledMock.store.updates).toHaveLength(0);
});

test('bascule un module déjà activé → update, pas insert', async () => {
  cell.maybe = { id: 'row-1' }; // la ligne portal_enabled_modules existe déjà
  renderGrid('site-1');
  const quizSwitch = await screen.findByRole('switch', { name: /activer quiz/i });
  fireEvent.click(quizSwitch);
  await waitFor(() => {
    expect(enabledMock.store.updates).toHaveLength(1);
  });
  expect(enabledMock.store.inserts).toHaveLength(0);
  expect(enabledMock.store.updates[0]).toEqual(expect.objectContaining({ is_enabled: false }));
});
