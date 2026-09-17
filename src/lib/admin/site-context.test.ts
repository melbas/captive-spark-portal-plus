// Tests ciblés — site courant (contexte global, verrou site_manager, persistance).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectInitialSite, isSiteAllowed } from './site-context';

interface Site {
  id: string;
  name: string;
  is_active: boolean;
}

const SITES: Site[] = [
  { id: 'site-a', name: 'Démo Salon', is_active: true },
  { id: 'site-b', name: 'Hôtel Y', is_active: true },
  { id: 'site-c', name: 'Campus Z', is_active: false },
];

test('site_manager est verrouillé sur SON site, même si un autre était mémorisé', () => {
  const locked = { role: 'site_manager' as const, siteId: 'site-b', resellerId: null };
  const s = selectInitialSite(SITES, [locked], 'site-a');
  assert.equal(s?.id, 'site-b');
});

test('super_admin retrouve le site mémorisé silencieusement (localStorage)', () => {
  const global_ = { role: 'super_admin' as const, siteId: null, resellerId: null };
  assert.equal(selectInitialSite(SITES, [global_], 'site-b')?.id, 'site-b');
});

test('site mémorisé disparu → premier site, pas de sélection fantôme', () => {
  const global_ = { role: 'super_admin' as const, siteId: null, resellerId: null };
  assert.equal(selectInitialSite(SITES, [global_], 'site-inexistant')?.id, 'site-a');
  assert.equal(selectInitialSite(SITES, [global_], null)?.id, 'site-a');
});

test('aucun site → sélection null (état vide géré)', () => {
  const global_ = { role: 'super_admin' as const, siteId: null, resellerId: null };
  assert.equal(selectInitialSite([], [global_], null), null);
});

test('isSiteAllowed: le site_manager ne bascule que vers son site', () => {
  const locked = { role: 'site_manager' as const, siteId: 'site-b', resellerId: null };
  assert.equal(isSiteAllowed(locked, 'site-b'), true);
  assert.equal(isSiteAllowed(locked, 'site-a'), false);
  const global_ = { role: 'super_admin' as const, siteId: null, resellerId: null };
  assert.equal(isSiteAllowed(global_, 'site-c'), true);
});
