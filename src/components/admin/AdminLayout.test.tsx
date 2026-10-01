import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAdminAuth');
vi.mock('@/context/SiteContext');
vi.mock('@/lib/admin/roles');

import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCurrentSite } from '@/context/SiteContext';
import { navItemsForRole } from '@/lib/admin/roles';
import AdminLayout from './AdminLayout';

test('renders sidebar hidden by default on mobile', () => {
  useAdminAuth.mockReturnValue({
    user: { email: 'test@example.com' },
    isAdmin: true,
    loading: false,
    signOut: vi.fn(),
  });

  useCurrentSite.mockReturnValue({
    sites: [],
    currentSite: null,
    currentSiteId: null,
    setCurrentSiteId: vi.fn(),
    locked: false,
    loading: false,
    memberships: [],
    role: '',
    canEdit: false,
  });

  navItemsForRole.mockReturnValue([]);

  render(
    <MemoryRouter>
      <AdminLayout />
    </MemoryRouter>
  );

  const sidebar = screen.getByLabelText(/sidebar/i);
  expect(sidebar).toHaveClass('hidden');
});
