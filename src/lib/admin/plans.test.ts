// Tests ciblés — forfaits (wifi_plans) : format prix FCFA, tri, validation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFcfa, formatDuration, sortPlans, validatePlan } from './plans';

test('formatFcfa: milliers séparés par espace + suffixe FCFA', () => {
  assert.equal(formatFcfa(500), '500 FCFA');
  assert.equal(formatFcfa(2000), '2 000 FCFA');
  assert.equal(formatFcfa(15000), '15 000 FCFA');
  assert.equal(formatFcfa(0), 'Gratuit');
});

test('formatDuration: minutes → libellé humain', () => {
  assert.equal(formatDuration(30), '30 min');
  assert.equal(formatDuration(60), '1 h');
  assert.equal(formatDuration(90), '1 h 30');
  assert.equal(formatDuration(720), '12 h');
  assert.equal(formatDuration(1440), '24 h');
});

test('sortPlans: ordre explicite (sort_order), badge populaire comme critère secondaire', () => {
  const plans = [
    { sort_order: 3, is_popular: false, name: 'C' },
    { sort_order: 1, is_popular: false, name: 'A' },
    { sort_order: 2, is_popular: true, name: 'B' },
    { sort_order: 2, is_popular: false, name: 'B2' },
  ];
  assert.deepEqual(
    sortPlans(plans).map((p) => p.name),
    ['A', 'B', 'B2', 'C'],
  );
});

test('validatePlan: nom + durée + prix >= 0 requis', () => {
  assert.equal(validatePlan({ name: '', duration_minutes: 60, price_fcfa: 500 }).ok, false);
  assert.equal(validatePlan({ name: 'Escale', duration_minutes: 0, price_fcfa: 500 }).ok, false);
  assert.equal(validatePlan({ name: 'Escale', duration_minutes: 60, price_fcfa: -1 }).ok, false);
  assert.equal(validatePlan({ name: 'Escale', duration_minutes: 60, price_fcfa: 500 }).ok, true);
});
