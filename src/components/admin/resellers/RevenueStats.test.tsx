import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import RevenueStats from './RevenueStats';

afterEach(() => {
  cleanup();
});

test('calcule le total des revenus et commissions depuis les transactions', () => {
  const transactions = [
    { amount_fcfa: 1000, commission_fcfa: 150 },
    { amount_fcfa: 500, commission_fcfa: 75 },
    { amount_fcfa: null, commission_fcfa: null },
  ];

  render(<RevenueStats transactions={transactions} />);

  // toLocaleString('fr-FR') utilise U+202F (espace fine insécable) comme
  // séparateur de milliers ; on normalise pour matcher '1 500' avec espace.
  const normalized = (s: string | null) => (s || '').replace(/[\u202f\u00a0]/g, ' ');

  // Revenus : 1000 + 500 + 0 (null safe) = 1500
  expect(normalized(screen.getByTestId('stat-revenue').textContent)).toContain('1 500');
  // Commissions : 150 + 75 + 0 = 225
  expect(normalized(screen.getByTestId('stat-commission').textContent)).toContain('225');
  // Net revendeur : 1500 - 225 = 1275
  expect(normalized(screen.getByTestId('stat-net').textContent)).toContain('1 275');
  // Nombre de transactions
  expect(screen.getByTestId('stat-count').textContent).toContain('3');
});

test('affiche zéro partout pour une liste vide', () => {
  render(<RevenueStats transactions={[]} />);

  expect(screen.getByTestId('stat-revenue').textContent).toContain('0');
  expect(screen.getByTestId('stat-commission').textContent).toContain('0');
  expect(screen.getByTestId('stat-net').textContent).toContain('0');
  expect(screen.getByTestId('stat-count').textContent).toContain('0');
});
