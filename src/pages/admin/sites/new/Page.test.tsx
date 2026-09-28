import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const singleMock = vi.fn(() =>
  Promise.resolve({ data: { id: 'new-site-1' }, error: null }),
);
const insertSiteMock = vi.fn(() => ({
  select: () => ({ single: singleMock }),
}));
const insertPlansMock = vi.fn(() => Promise.resolve({ error: null }));
const fromMock = vi.fn((t: string) =>
  t === 'sites'
    ? { insert: insertSiteMock }
    : { insert: insertPlansMock },
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NewSiteWizardPage from './Page';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/sites/new']}>
        <Routes>
          <Route path="/admin/sites/new" element={<NewSiteWizardPage />} />
          <Route
            path="/admin/sites/:siteId"
            element={<div data-testid="site-detail-redirect" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  insertSiteMock.mockClear();
  insertPlansMock.mockClear();
  singleMock.mockClear();
});

test('passe de l\u2019\u00e9tape 1 \u00e0 l\u2019\u00e9tape 2 apr\u00e8s avoir rempli nom, slug et localisation', () => {
  renderPage();

  expect(screen.getByText(/cr\u00e9er un site/i)).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /^localisation$/i }),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/nom du site/i), {
    target: { value: 'Hôtel Terrou' },
  });
  fireEvent.change(screen.getByLabelText(/slug du portail/i), {
    target: { value: 'hotel-terrou' },
  });
  fireEvent.change(screen.getByLabelText(/localisation/i), {
    target: { value: 'Dakar' },
  });

  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

  expect(
    screen.getByRole('heading', { name: /^identit\u00e9$/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/logo/i)).toBeInTheDocument();
});

test('cr\u00e9e le site + les forfaits par d\u00e9faut puis redirige vers le d\u00e9tail', async () => {
  renderPage();

  // Étape 1 : localisation
  fireEvent.change(screen.getByLabelText(/nom du site/i), {
    target: { value: 'Hôtel Terrou' },
  });
  fireEvent.change(screen.getByLabelText(/slug du portail/i), {
    target: { value: 'hotel-terrou' },
  });
  fireEvent.change(screen.getByLabelText(/localisation/i), {
    target: { value: 'Dakar' },
  });
  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

  // Étape 2 : identité
  fireEvent.change(screen.getByLabelText(/couleur principale/i), {
    target: { value: '#5B4DFF' },
  });
  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

  // Étape 3 : support
  fireEvent.change(screen.getByLabelText(/whatsapp/i), {
    target: { value: '+221770000000' },
  });
  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

  // Étape 4 : forfaits (preset 100/300/500 FCFA, cochés par défaut)
  expect(
    screen.getByRole('heading', { name: /^forfaits$/i }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /cr\u00e9er le site/i }));

  await waitFor(() => {
    expect(insertSiteMock).toHaveBeenCalled();
  });
  expect(insertSiteMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Hôtel Terrou',
      portal_slug: 'hotel-terrou',
      location: 'Dakar',
      primary_color: '#5B4DFF',
      whatsapp_support: '+221770000000',
      is_active: true,
    }),
  );
  expect(insertPlansMock).toHaveBeenCalled();
  const insertedPlans = insertPlansMock.mock.calls[0][0];
  expect(insertedPlans).toHaveLength(3);
  expect(insertedPlans[0]).toEqual(
    expect.objectContaining({
      site_id: 'new-site-1',
      price_fcfa: 100,
    }),
  );

  await waitFor(() => {
    expect(screen.getByTestId('site-detail-redirect')).toBeInTheDocument();
  });
});
