/**
 * Task 13 : AdsCarousel — CRUD des pubs (ad_videos) par site.
 * Rend la liste, vérifie la mutation update sur changement de poids
 * (priority) et sur le toggle actif.
 */
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const adsRows = [
  {
    id: 'ad-1', site_id: 'site-1', title: 'Promo rentrée',
    video_url: 'https://cdn.example.com/promo.mp4', thumbnail_url: null,
    type: 'video', priority: 10, active: true,
  },
  {
    id: 'ad-2', site_id: 'site-1', title: 'Jingle audio',
    video_url: 'https://cdn.example.com/jingle.mp3', thumbnail_url: null,
    type: 'audio', priority: 5, active: false,
  },
];

const store = { updates: [] as { patch: any; id: string }[], deletes: [] as string[], inserts: [] as any[] };

const chain = {
  select: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  order: vi.fn(async () => ({ data: adsRows, error: null })),
  insert: vi.fn(async (p: any) => { store.inserts.push(p); return { data: null, error: null }; }),
  update: vi.fn((patch: any) => {
    // update(patch).eq('id', id) — on capture via le prochain eq
    eqCapturer.patch = patch;
    return chain;
  }),
  delete: vi.fn(() => chain),
};
const eqCapturer = { patch: null as any };
// eq pour les mutations (après update/delete) : resolve + capture id
chain.eq.mockImplementation((col: string, val?: string) => {
  if (eqCapturer.patch && col === 'id') {
    if (eqCapturer.patch.__delete) store.deletes.push(val as string);
    else store.updates.push({ patch: eqCapturer.patch, id: val as string });
    eqCapturer.patch = null;
    return Promise.resolve({ data: null, error: null });
  }
  return chain;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => (table === 'ad_videos' ? chain : {}) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdsCarousel from './AdsCarousel';

beforeEach(() => {
  store.updates.length = 0;
  store.deletes.length = 0;
  store.inserts.length = 0;
  eqCapturer.patch = null;
  chain.select.mockClear();
  chain.eq.mockClear();
  chain.order.mockClear();
  chain.update.mockClear();
  chain.delete.mockClear();
  chain.insert.mockClear();
});

afterEach(cleanup);

function renderCarousel(siteId = 'site-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdsCarousel siteId={siteId} canEdit />
    </QueryClientProvider>,
  );
}

test('affiche les pubs du site triées par poids (priority desc)', async () => {
  renderCarousel();
  expect(await screen.findByText('Promo rentrée')).toBeInTheDocument();
  expect(screen.getByText('Jingle audio')).toBeInTheDocument();
  // ordre décroissant : la première ligne est la priority la plus haute
  const titles = screen.getAllByTestId('ad-title');
  expect(titles[0]).toHaveTextContent('Promo rentrée');
  expect(titles[1]).toHaveTextContent('Jingle audio');
});

test('changer le poids (priority) déclenche une mutation update', async () => {
  renderCarousel();
  const prioInput = await screen.findByDisplayValue('10');
  fireEvent.change(prioInput, { target: { value: '42' } });
  fireEvent.blur(prioInput);
  await waitFor(() => {
    expect(store.updates).toHaveLength(1);
  });
  expect(store.updates[0]).toEqual({ patch: { priority: 42 }, id: 'ad-1' });
});

test('basculer le toggle actif déclenche une mutation update active', async () => {
  renderCarousel();
  const switchAudio = await screen.findByRole('switch', { name: /activer jingle audio/i });
  expect(switchAudio).not.toBeChecked();
  fireEvent.click(switchAudio);
  await waitFor(() => {
    expect(store.updates).toHaveLength(1);
  });
  expect(store.updates[0]).toEqual({ patch: { active: true }, id: 'ad-2' });
});
