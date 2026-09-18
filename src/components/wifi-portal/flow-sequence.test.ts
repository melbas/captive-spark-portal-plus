// Tests ciblés — séquenceur de parcours (remplace le switch codé en dur).
// La Forge publie portal_config.flow_order ; le portail l'exécute via ces
// fonctions. Déterministe, sans réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFlowSequence, nextStepInFlow } from './flow-sequence.ts';

import { STEP as Step } from './flow-sequence.ts';

test('resolveFlowSequence: AUTH d\'abord, SUCCESS à la fin (fixes)', () => {
  const seq = resolveFlowSequence(['quiz', 'payment']);
  assert.equal(seq[0], Step.AUTH);
  assert.equal(seq[seq.length - 1], Step.SUCCESS);
});

test('resolveFlowSequence: respecte l\'ordre publié par la Forge', () => {
  const seq = resolveFlowSequence(['payment', 'quiz', 'rewards']);
  assert.deepEqual(seq, [
    Step.AUTH, Step.PAYMENT, Step.ENGAGEMENT, Step.REWARDS, Step.SUCCESS,
  ]);
});

test('resolveFlowSequence: sans ordre publié → ordre par défaut complet', () => {
  // Rétro-compatibilité : la démo et les sites non forgés gardent leur parcours
  const seq = resolveFlowSequence();
  assert.equal(seq[0], Step.AUTH);
  assert.ok(seq.length > 3, 'le parcours par défaut contient plusieurs préceptes');
  assert.equal(seq[seq.length - 1], Step.SUCCESS);
  assert.deepEqual(resolveFlowSequence([]), resolveFlowSequence(undefined));
});

test('resolveFlowSequence: ordre vide = ordre indéfini (même défaut)', () => {
  assert.deepEqual(resolveFlowSequence([]), resolveFlowSequence(undefined));
});

test('resolveFlowSequence: quiz ET video → ENGAGEMENT une seule fois (dédoublonnage)', () => {
  const seq = resolveFlowSequence(['video', 'quiz', 'payment']);
  const engagements = seq.filter((s) => s === Step.ENGAGEMENT);
  assert.equal(engagements.length, 1);
});

test('resolveFlowSequence: noms inconnus ignorés (fail-safe, pas de throw)', () => {
  const seq = resolveFlowSequence(['quiz', 'module_inventé', 'payment']);
  assert.deepEqual(seq, [Step.AUTH, Step.ENGAGEMENT, Step.PAYMENT, Step.SUCCESS]);
});

test('nextStepInFlow: avance dans le parcours publié', () => {
  const order = ['quiz', 'payment', 'rewards'];
  assert.equal(nextStepInFlow(Step.AUTH, order), Step.ENGAGEMENT);
  assert.equal(nextStepInFlow(Step.ENGAGEMENT, order), Step.PAYMENT);
  assert.equal(nextStepInFlow(Step.PAYMENT, order), Step.REWARDS);
  assert.equal(nextStepInFlow(Step.REWARDS, order), Step.SUCCESS);
});

test('nextStepInFlow: dernière étape → SUCCESS (jamais hors parcours)', () => {
  assert.equal(nextStepInFlow(Step.SUCCESS, ['quiz']), Step.SUCCESS);
});

test('nextStepInFlow: sans ordre publié → parcours par défaut', () => {
  const first = nextStepInFlow(Step.AUTH);
  assert.equal(first, Step.ENGAGEMENT);
});
