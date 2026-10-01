import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryEqMock = vi.fn(() =>
  Promise.resolve({
    data: {
      id: 'site-1',
      name: 'Hôtel Terrou',
      portal_slug: 'hotel-terrou',
      logo_url: null,
      primary_color: '#5B4DFF',
      welcome_msg: 'Bienvenue !',
      is_active: true,
    },
    error: null,
  }),
);
const singleMock = vi.fn(() => Promise.resolve(queryEqMock()));
const selectMock = vi.fn(() => ({ eq: vi.fn(() => ({ single: singleMock })) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/admin/sites/SiteForm', () => ({
  default: () => <div data-testid="site-form" />,
}));
vi.mock('@/components/admin/sites/SitePreview', () => ({
  default: () => <div data-testid="site-preview" />,
}));
vi.mock('@/components/admin/sites/PlansTab', () => ({
  default: () => <div data-testid="plans-tab" />,
}));

import SiteDetailPage from './Page';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/sites/site-1']}>
        <Routes>
          <Route path="/admin/sites/:siteId" element={<SiteDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('loads the site by route param and shows the editable form with the copyable portal link', async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.assign(navigator, { clipboard: { writeText } });

  renderPage();

  expect(await screen.findByTestId('site-form')).toBeInTheDocument();

  const linkInput = await screen.findByLabelText(/lien du portail/i);
  expect(linkInput).toHaveValue('http://localhost:3000/portal/hotel-terrou');

  fireEvent.click(screen.getByRole('button', { name: /copier/i }));
  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/portal/hotel-terrou');
  });
});

test('switches to the plans tab', async () => {
  renderPage();

  const plansTab = await screen.findByRole('tab', { name: /forfaits/i });
  // Radix Tabs : le clic passe par les événements pointeur.
  fireEvent.mouseDown(plansTab);
  fireEvent.click(plansTab);
  await waitFor(() => {
    expect(screen.getByTestId('plans-tab')).toBeInTheDocument();
  });
});
