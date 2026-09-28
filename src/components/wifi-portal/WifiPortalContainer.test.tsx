/**
 * Task 18 (plan 2026-09-28-portail-captif-redesign) — WifiPortalContainer ne
 * sert plus AUCUN contenu démo en dur. Toutes les pubs (slides, vidéo, audio)
 * viennent de la DB (ad_videos par siteId, via usePortalConfig).
 *
 * Contrat testé :
 *  1. Une pub venue de la DB (ad_videos) s'affiche.
 *  2. Les replis démo (slides hardcodés, sample-videos.com, soundhelix.com)
 *     n'apparaissent plus, même en mode démo sans config publiée.
 *
 * Note : le mock Supabase suit le pattern de Portal.test.tsx (builder en chaîne
 * résolu en Promise). matchMedia est polyfillé pour le ThemeProvider.
 */
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/components/LanguageContext';

/* ---------- Faux schéma : site + config + modules + une pub vidéo DB ---------- */

const siteRow = {
  id: 'site-1',
  name: 'Démo',
  portal_slug: null,
  logo_url: null,
  primary_color: null,
  is_active: true,
};

// Pub image (pas d'extension média) → devient un slide du carrousel, visible
// dès l'étape AUTH (contrairement aux médias vidéo/audio, réservés post-auth).
const adRow = {
  id: 'ad-db-1',
  title: 'Pub Base de Données',
  video_url: 'https://cdn.exemple.sn/pub-restaurant.jpg',
  thumbnail_url: null,
  type: 'image',
};

const results: Record<string, { data: unknown; error: unknown }> = {
  sites: { data: siteRow, error: null },
  portal_config: { data: null, error: null },
  portal_customizations: { data: [], error: null },
  portal_modules: { data: [], error: null },
  portal_enabled_modules: { data: [], error: null },
  ad_videos: { data: [adRow], error: null },
  wifi_users: { data: null, error: null },
  wifi_sessions: { data: null, error: null },
  portal_statistics: { data: null, error: null },
};

function chainFor(name: string) {
  const p = Promise.resolve(results[name] ?? { data: [], error: null });
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    single: () => p,
    maybeSingle: () => p,
    insert: () => p,
    update: () => p,
    then: (
      res: (v: { data: unknown; error: unknown }) => unknown,
      rej: (e: unknown) => unknown,
    ) => p.then(res, rej),
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => chainFor(t),
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}));

// jsdom n'implémente pas matchMedia (ThemeProvider "system" en a besoin).
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

import { clearPortalConfigCache } from '@/hooks/usePortalConfig';
import WifiPortalContainer from './WifiPortalContainer';

afterEach(cleanup);

/**
 * Rend le conteneur sur la route racine (portail démo) et attend que la config
 * soit résolue : le titre h1 (nom du site) n'apparaît qu'après le chargement
 * (avant : écran spinner "Chargement...").
 */
async function renderAndWaitForConfig() {
  clearPortalConfigCache();
  window.history.replaceState({}, '', '/');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <WifiPortalContainer />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  // Le titre h1 (nom du site) n'apparaît qu'une fois la config résolue.
  await screen.findByText('Démo', {}, { timeout: 3000 });
  // Laisse les dernières mises à jour d'état se figer avant les assertions.
  await act(async () => {});
}

test('affiche une pub venue de la DB (ad_videos du site)', async () => {
  await renderAndWaitForConfig();
  expect(screen.getByText('Pub Base de Données')).toBeInTheDocument();
  // Et la source du slide est bien l'URL de la DB.
  const img = screen.getByAltText('Pub Base de Données');
  expect(img.getAttribute('src')).toBe('https://cdn.exemple.sn/pub-restaurant.jpg');
});

test("ne sert plus aucun repli démo : ni slides hardcodés, ni sample-videos.com, ni soundhelix.com", async () => {
  await renderAndWaitForConfig();
  const html = document.body.innerHTML;
  expect(html).not.toContain('sample-videos.com');
  expect(html).not.toContain('soundhelix.com');
  // Slides démo hardcodés dans portal-config-defaults.ts (DEMO_AD_SLIDES).
  expect(html).not.toContain('Accès WiFi Haut Débit');
  expect(html).not.toContain('WiFi pour Entreprises');
});
