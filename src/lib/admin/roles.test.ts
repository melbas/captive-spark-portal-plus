// Tests ciblés — rôles multi-tenant back office.
// Exécution : voir scripts tdd (compilation tsc + node --test), cf. docs/RAPPORT-ADMIN.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapLegacyRole,
  resolveMemberships,
  effectiveRole,
  navItemsForRole,
  canEdit,
  canEditSite,
} from './roles';

test("mapLegacyRole: le rôle DB 'admin' existant devient super_admin", () => {
  assert.equal(mapLegacyRole('admin'), 'super_admin');
  assert.equal(mapLegacyRole('super_admin'), 'super_admin');
  assert.equal(mapLegacyRole('site_manager'), 'site_manager');
  assert.equal(mapLegacyRole('reseller'), 'reseller');
  assert.equal(mapLegacyRole('viewer'), 'viewer');
  assert.equal(mapLegacyRole('inconnu'), 'viewer');
});

test('resolveMemberships: extrait site_id/reseller_id des lignes user_roles', () => {
  const rows = [
    { role: 'admin', site_id: null, reseller_id: null },
    { role: 'site_manager', site_id: 'site-a', reseller_id: null },
    { role: 'viewer', site_id: 'site-b', reseller_id: 'r1' },
  ];
  const ms = resolveMemberships(rows);
  assert.equal(ms.length, 3);
  assert.deepEqual(ms[1], { role: 'site_manager', siteId: 'site-a', resellerId: null });
  assert.equal(ms[2].resellerId, 'r1');
});

test('effectiveRole: super_admin gagne, viewer est le plus faible', () => {
  assert.equal(
    effectiveRole([
      { role: 'viewer', siteId: null, resellerId: null },
      { role: 'super_admin', siteId: null, resellerId: null },
    ]),
    'super_admin',
  );
  assert.equal(
    effectiveRole([{ role: 'viewer', siteId: null, resellerId: null }]),
    'viewer',
  );
  assert.equal(effectiveRole([]), null);
});

test('navItemsForRole: site_manager ne voit pas Revendeurs ni Paramètres', () => {
  const all = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/resellers', label: 'Revendeurs' },
    { to: '/admin/sites', label: 'Sites' },
    { to: '/admin/modules', label: 'Modules du parcours' },
    { to: '/admin/plans', label: 'Forfaits' },
    { to: '/admin/sessions', label: 'Sessions' },
    { to: '/admin/settings', label: 'Paramètres' },
  ];
  const sm = navItemsForRole('site_manager', all).map((i) => i.label);
  assert.ok(!sm.includes('Revendeurs'));
  assert.ok(!sm.includes('Paramètres'));
  assert.ok(sm.includes('Sites'));
  const sa = navItemsForRole('super_admin', all);
  assert.equal(sa.length, all.length);
});

test('canEdit: viewer lecture seule, site_manager édite son site, super_admin édite tout', () => {
  assert.equal(canEdit('viewer'), false);
  assert.equal(canEdit('site_manager'), true);
  assert.equal(canEdit('super_admin'), true);
  assert.equal(canEdit('reseller'), true);
});

test('canEditSite: site_manager verrouillé sur son site uniquement', () => {
  assert.equal(canEditSite('site_manager', 'site-a', 'site-a'), true);
  assert.equal(canEditSite('site_manager', 'site-a', 'site-b'), false);
  assert.equal(canEditSite('super_admin', 'site-a', 'site-b'), true);
  assert.equal(canEditSite('viewer', 'site-a', 'site-a'), false);
});
