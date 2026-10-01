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

const siteRow: {
  id: string;
  name: string;
  portal_slug: string;
  logo_url: string;
  primary_color: string | null;
  welcome_msg: string | null;
  is_active: boolean;
  portal_template?: string | null;
} = {
  id: 'site-1',
  name: 'Hôtel Test',
  portal_slug: 'hotel-test',
  logo_url: 'test.png',
  primary_color: null,
  welcome_msg: null, // volontairement null : le message doit venir de portal_config
  is_active: true,
};

/**
 * Surcharge par test du site renvoyé par sites (routeur de templates).
 * makeChain() recrée la chaîne à chaque appel : les mutations par test ne
 * fuient pas dans les suivants.
 */
let currentSiteRow = siteRow;
function makeChain(name: string) {
  const results: Record<string, { data: unknown; error: unknown }> = {
    sites: { data: currentSiteRow, error: null },
    wifi_plans: { data: [], error: null },
    portal_config: {
      data: {
        id: 'cfg-1',
        portal_name: 'Portail Hôtel Test',
        logo_url: null,
        theme_color: null,
        welcome_message: 'Bienvenue au Hôtel Test !',
        portal_status: 'active',
      },
      error: null,
    },
  };
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
  supabase: { from: (t: string) => makeChain(t) },
}));

// Templates labo mockés en tête de fichier (hoisting) : les tests du routeur
// assertent le routage/les props, pas le rendu DB des templates eux-mêmes
// (couvert par leurs propres suites).
vi.mock('@/components/portal-templates/instant/InstantTemplate', () => ({
  default: ({ siteId }: { siteId: string }) => (
    <div data-testid="instant-template">{siteId}</div>
  ),
}));
vi.mock('@/components/portal-templates/echange/EchangeTemplate', () => ({
  default: ({ siteId }: { siteId?: string }) => (
    <div data-testid="echange-template">{siteId}</div>
  ),
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

// ---- Routeur de templates (migration 20260930000000) ----

test('portal_template "scene" rend le template Scène', async () => {
  currentSiteRow = { ...siteRow, portal_template: 'scene' };
  renderPortal();

  // Le splash scène remplace le parcours instant : badge « WiFi officiel »
  // présent, CTA « Rejoindre » présent, CTA parcours instant absent.
  expect(await screen.findByText('WiFi officiel')).toBeInTheDocument();
  expect(screen.getByTestId('scene-join')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /se connecter|wifi gratuit/i })).not.toBeInTheDocument();
});

test('portal_template null garde le portail actuel (fallback legacy)', async () => {
  currentSiteRow = { ...siteRow, portal_template: null };
  renderPortal();

  // Le parcours legacy (WifiPortalContainer) affiche le message portal_config ;
  // aucun splash scène et PAS de InstantTemplate (fallback ≠ choix explicite).
  expect(await screen.findByText('Bienvenue au Hôtel Test !')).toBeInTheDocument();
  expect(screen.queryByText('WiFi officiel')).not.toBeInTheDocument();
});

test('portal_template inconnu retombe sur le portail actuel', async () => {
  currentSiteRow = { ...siteRow, portal_template: 'mystere' };
  renderPortal();

  expect(await screen.findByText('Bienvenue au Hôtel Test !')).toBeInTheDocument();
  expect(screen.queryByText('WiFi officiel')).not.toBeInTheDocument();
});

test('portal_template "echange" et "instant" routent vers les templates du labo', async () => {
  // Templates mockés en tête de fichier : le siteId reçu en prop est affiché,
  // ce qui prouve le routage ET la transmission des props.
  currentSiteRow = { ...siteRow, portal_template: 'echange' };
  renderPortal();
  expect(await screen.findByTestId('echange-template')).toHaveTextContent('site-1');
  expect(screen.queryByText('WiFi officiel')).not.toBeInTheDocument();
  cleanup();

  currentSiteRow = { ...siteRow, portal_template: 'instant' };
  renderPortal();
  expect(await screen.findByTestId('instant-template')).toHaveTextContent('site-1');
  cleanup();
});
