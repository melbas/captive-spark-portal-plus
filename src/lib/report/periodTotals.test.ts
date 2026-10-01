import { describe, it, expect } from 'vitest';
import { filterByPeriod, computePeriodTotals } from './periodTotals';

interface Tx {
  id: string;
  amount_fcfa: number;
  commission_fcfa: number;
  created_at: string;
}

const txs: Tx[] = [
  { id: 't1', amount_fcfa: 1000, commission_fcfa: 50, created_at: '2026-09-01T10:00:00Z' },
  { id: 't2', amount_fcfa: 2500, commission_fcfa: 125, created_at: '2026-09-15T10:00:00Z' },
  { id: 't3', amount_fcfa: 500, commission_fcfa: 25, created_at: '2026-10-01T10:00:00Z' },
];

describe('filterByPeriod', () => {
  it('filtre par created_at dans [from, to] inclusifs (date fin = fin de journée)', () => {
    const filtered = filterByPeriod(txs, 'created_at', { from: '2026-09-01', to: '2026-09-30' });
    expect(filtered.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('inclut les transactions du jour de fin (created_at à une heure quelconque)', () => {
    const filtered = filterByPeriod(txs, 'created_at', { from: '2026-09-15', to: '2026-09-15' });
    expect(filtered.map((t) => t.id)).toEqual(['t2']);
  });

  it('retourne tout si from et to sont absents', () => {
    expect(filterByPeriod(txs, 'created_at', {})).toHaveLength(3);
  });

  it('ignore les lignes sans date', () => {
    const rows: Tx[] = [{ id: 't4', amount_fcfa: 1, commission_fcfa: 0, created_at: '' }];
    expect(filterByPeriod(rows, 'created_at', { from: '2026-01-01', to: '2026-12-31' })).toHaveLength(0);
  });
});

describe('computePeriodTotals', () => {
  it('compte les lignes filtrées et somme les champs numériques configurés', () => {
    const totals = computePeriodTotals(txs, 'created_at', {
      from: '2026-09-01',
      to: '2026-09-30',
      fields: ['amount_fcfa', 'commission_fcfa'],
    });
    expect(totals.count).toBe(2);
    expect(totals.sums).toEqual({ amount_fcfa: 3500, commission_fcfa: 175 });
  });

  it('retourne count 0 et sommes à 0 pour une période sans données', () => {
    const totals = computePeriodTotals(txs, 'created_at', {
      from: '2025-01-01',
      to: '2025-12-31',
      fields: ['amount_fcfa'],
    });
    expect(totals.count).toBe(0);
    expect(totals.sums).toEqual({ amount_fcfa: 0 });
  });

  it('ignore les valeurs non numériques dans les champs sommés', () => {
    const rows = [
      { id: 'a', amount_fcfa: 100, created_at: '2026-05-01T10:00:00Z' },
      { id: 'b', amount_fcfa: null, created_at: '2026-05-02T10:00:00Z' },
    ];
    const totals = computePeriodTotals(rows, 'created_at', {
      from: '2026-01-01',
      to: '2026-12-31',
      fields: ['amount_fcfa'],
    });
    expect(totals.count).toBe(2);
    expect(totals.sums).toEqual({ amount_fcfa: 100 });
  });
});
