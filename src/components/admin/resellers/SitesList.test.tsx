import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SitesList from './SitesList';

afterEach(() => {
  cleanup();
});

function renderList(sites: Parameters<typeof SitesList>[0]['sites']) {
  return render(
    <MemoryRouter>
      <SitesList sites={sites} />
    </MemoryRouter>,
  );
}

test('affiche chaque site avec son revenu agrégé', () => {
  renderList([
    { id: 's1', name: 'Hôtel Terrou', portal_slug: 'terrou', location: 'Dakar', is_active: true, revenue: 12500 },
    { id: 's2', name: 'Café de Rome', portal_slug: 'rome', location: null, is_active: false, revenue: 0 },
  ]);

  expect(screen.getByText('Hôtel Terrou')).toBeTruthy();
  expect(screen.getByText('Café de Rome')).toBeTruthy();
  expect(screen.getByText('Dakar')).toBeTruthy();
  // Localisation manquante → em dash
  expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  // Revenus formatés fr-FR (espace fine insécable normalisée dans la regex)
  expect(screen.getByText(/12\s500 FCFA/)).toBeTruthy();
  expect(screen.getByText('0 FCFA')).toBeTruthy();
});

test('affiche le message vide quand aucun site', () => {
  renderList([]);
  expect(screen.getByText('Aucun site rattaché')).toBeTruthy();
});
