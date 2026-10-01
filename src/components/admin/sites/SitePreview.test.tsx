import { test, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/lib/admin/modules', () => ({
  portalUrl: vi.fn((origin: string, slug: string, draft: boolean) =>
    `${origin}/portal/${slug}${draft ? '?preview=1' : ''}`,
  ),
}));

import SitePreview from './SitePreview';

const ORIGIN = 'http://test.local';

test('renders an iframe pointing at the draft portal URL of the site slug', () => {
  render(<SitePreview slug="hotel-terrou" origin={ORIGIN} />);

  const iframe = screen.getByTitle(/aperçu du portail/i);
  expect(iframe).toHaveAttribute('src', `${ORIGIN}/portal/hotel-terrou?preview=1`);
  cleanup();
});

test('reloads the iframe when the refresh key changes', () => {
  const { rerender } = render(<SitePreview slug="hotel-terrou" origin={ORIGIN} refreshKey={0} />);
  const iframe = screen.getByTitle(/aperçu du portail/i);
  const srcBefore = iframe.getAttribute('src');

  rerender(<SitePreview slug="hotel-terrou" origin={ORIGIN} refreshKey={1} />);
  const iframeAfter = screen.getByTitle(/aperçu du portail/i);
  expect(iframeAfter.getAttribute('src')).toBe(srcBefore);
  // Le key change force React à remonter l'iframe (rechargement effectif).
  expect(iframeAfter).not.toBe(iframe);
  cleanup();
});
