// Tests ciblés — modules du parcours (catalogue × activations par site).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeModuleStates, portalUrl, moduleIcon, moveFlowStep, toggleFlowStep,
} from './modules.ts';

const CATALOGUE = [
  { id: 'm1', module_name: 'payment', display_name: 'Accès Payant' },
  { id: 'm2', module_name: 'mini_games', display_name: 'Mini-Jeux' },
  { id: 'm3', module_name: 'learning_center', display_name: 'Learning Center' },
];

test('sans ligne portal_enabled_modules → tous les modules sont désactivés (off)', () => {
  const states = mergeModuleStates(CATALOGUE, []);
  assert.deepEqual(
    states.map((s) => s.enabled),
    [false, false, false],
  );
  assert.equal(states.length, 3);
});

test('les activations connues sont appliquées, l\'ordre du catalogue est conservé', () => {
  const enabled = [
    { module_id: 'm2', is_enabled: true },
    { module_id: 'm1', is_enabled: false },
  ];
  const states = mergeModuleStates(CATALOGUE, enabled);
  assert.deepEqual(
    states.map((s) => s.enabled),
    [false, true, false],
  );
  assert.equal(states[0].module_name, 'payment');
});

test('is_enabled false explicite désactive (pas seulement « absent »)', () => {
  const enabled = [{ module_id: 'm3', is_enabled: false }];
  const states = mergeModuleStates(CATALOGUE, enabled);
  assert.equal(states.find((s) => s.id === 'm3')?.enabled, false);
});

test('portalUrl: URL du portail publiée /portal/<slug>', () => {
  assert.equal(portalUrl('https://app.exemple.fr', 'demo', false), 'https://app.exemple.fr/portal/demo');
});

test('portalUrl: la version brouillon est marquée ?preview=1 (aperçu ≠ publiée)', () => {
  const url = portalUrl('https://app.exemple.fr', 'demo', true);
  assert.equal(url, 'https://app.exemple.fr/portal/demo?preview=1');
});

test('moduleIcon: chaque module du catalogue a une icône lisible (fallback inclus)', () => {
  assert.equal(typeof moduleIcon('mini_games'), 'string');
  assert.ok(moduleIcon('mini_games').length > 0);
  assert.equal(moduleIcon('module_inconnu'), 'puzzle');
});

// ── Forge : ordre du parcours (moveFlowStep / toggleFlowStep) ───────────────

test('moveFlowStep: monte un précepte d\'un cran (immuable)', () => {
  const order = ['quiz', 'video', 'payment'];
  assert.deepEqual(moveFlowStep(order, 'video', -1), ['video', 'quiz', 'payment']);
  // L'ordre d'origine n'est pas muté (state React)
  assert.deepEqual(order, ['quiz', 'video', 'payment']);
});

test('moveFlowStep: descend un précepte d\'un cran', () => {
  assert.deepEqual(
    moveFlowStep(['quiz', 'video', 'payment'], 'video', 1),
    ['quiz', 'payment', 'video'],
  );
});

test('moveFlowStep: hors bornes → ordre inchangé (pas de throw)', () => {
  const order = ['quiz', 'video'];
  assert.deepEqual(moveFlowStep(order, 'quiz', -1), ['quiz', 'video']);
  assert.deepEqual(moveFlowStep(order, 'video', 1), ['quiz', 'video']);
  assert.deepEqual(moveFlowStep(order, 'absent', 1), ['quiz', 'video']);
});

test('toggleFlowStep: l\'activation ajoute en fin de parcours', () => {
  assert.deepEqual(
    toggleFlowStep(['quiz', 'video'], 'payment', true),
    ['quiz', 'video', 'payment'],
  );
});

test('toggleFlowStep: la désactivation retire sans toucher au reste', () => {
  assert.deepEqual(
    toggleFlowStep(['quiz', 'video', 'payment'], 'video', false),
    ['quiz', 'payment'],
  );
});

test('toggleFlowStep: idempotent (déjà activé/désactivé → inchangé)', () => {
  assert.deepEqual(toggleFlowStep(['quiz'], 'quiz', true), ['quiz']);
  assert.deepEqual(toggleFlowStep([], 'quiz', false), []);
});
