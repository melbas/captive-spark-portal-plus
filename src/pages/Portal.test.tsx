/**
 * Task 17 (plan 2026-09-28-portail-captif-redesign) — Portal lit exclusivement
 * depuis Supabase : site (par slug), portal_config/customizations, modules,
 * pubs, jeux, quizzes, récompenses. On mock le client Supabase et on asserte
 * le rendu réel (logo + message de bienvenue issus de la base).
 */
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/components/LanguageContext';

const siteRow = {
  id: 'site-1',
  name: 'Hôtel Test',
  portal_slug: 'hotel-test',
  logo_url: 'test.png',
  primary_color: null,
  welcome_msg: null, // volontairement null : le message doit venir de portal_config
  is_active: true,
};

const portalConfigRow = {
  id: 'cfg-1',
  site_id: 'site-1',
  portal_name: 'Portail Hôtel Test',
  logo_url: null,
  theme_color: null,
  welcome_message: 'Bienvenue au Hôtel Test !',
  portal_status: 'active',
};

const results: Record<string, { data: unknown; error: unknown }> = {
  sites: { data: siteRow, error: null },
  wifi_plans: { data: [], error: null },
  portal_config: { data: portalConfigRow, error: null },
  portal_customizations: { data: [], error: null },
  portal_enabled_modules: { data: [], error: null },
  portal_modules: { data: [], error: null },
  ad_videos: { data: [], error: null },
  games: { data: [], error: null },
  quizzes: { data: [], error: null },
  rewards: { data: [], error: null },
};

function chainFor(name: string) {
  const p = Promise.resolve(results[name] ?? { data: [], error: null });
  const chain = {
    select: () => chain,
    eq: () => chain,
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

import Portal from './Portal';

afterEach(cleanup);

function renderPortal() {
  // MAC présente (params UniFi) pour ne pas tomber sur PortalNoAccess.
  window.history.replaceState({}, '', '/portal/hotel-test?id=aa:bb:cc');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/portal/hotel-test']}>
          <Routes>
            <Route path="/portal/:slug" element={<Portal />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

test('affiche le logo du site lu depuis Supabase (logo_url = test.png)', async () => {
  renderPortal();
  const logo = await screen.findByAltText('Hôtel Test');
  expect(logo.getAttribute('src')).toContain('test.png');
});

test('affiche le message de bienvenue publié (portal_config.welcome_message)', async () => {
  renderPortal();
  // site.welcome_msg est null : seul portal_config.welcome_message peut fournir ce texte.
  expect(await screen.findByText('Bienvenue au Hôtel Test !')).toBeInTheDocument();
});
