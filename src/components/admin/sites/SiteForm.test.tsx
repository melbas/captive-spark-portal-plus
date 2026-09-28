import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const updateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn((_table: string) => ({ update: updateMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

import SiteForm from './SiteForm';

const defaultSite = {
  id: 'site-1',
  name: 'Hôtel Terrou',
  portal_slug: 'hotel-terrou',
  logo_url: '',
  primary_color: '#5B4DFF',
  welcome_msg: 'Bienvenue !',
  is_active: false,
};

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SiteForm site={defaultSite} canEdit />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fromMock.mockClear();
  updateMock.mockClear();
  updateEqMock.mockClear();
});

test('submits the form and updates the site with the edited fields', async () => {
  renderForm();

  fireEvent.change(screen.getByLabelText(/nom du site/i), {
    target: { value: 'Hôtel du Lac' },
  });
  fireEvent.change(screen.getByLabelText(/logo/i), {
    target: { value: 'https://cdn.example.com/logo.png' },
  });
  fireEvent.change(screen.getByLabelText(/couleur principale/i), {
    target: { value: '#FF8800' },
  });
  fireEvent.change(screen.getByLabelText(/message de bienvenue/i), {
    target: { value: 'Karibou !' },
  });
  fireEvent.click(screen.getByRole('switch', { name: /portail activé/i }));

  fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

  await waitFor(() => {
    expect(fromMock).toHaveBeenCalledWith('sites');
  });
  expect(updateMock).toHaveBeenCalledWith({
    name: 'Hôtel du Lac',
    logo_url: 'https://cdn.example.com/logo.png',
    primary_color: '#FF8800',
    welcome_msg: 'Karibou !',
    is_active: true,
  });
  expect(updateEqMock).toHaveBeenCalledWith('id', 'site-1');
  await waitFor(() => {
    expect(screen.getByText(/site enregistré/i)).toBeInTheDocument();
  });
});
