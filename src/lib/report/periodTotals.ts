/**
 * Totaux par période côté client, sur des données déjà chargées.
 *
 * Approche retenue : filtrage client (created_at >= début / <= fin de journée)
 * plutôt qu'une requête Supabase supplémentaire — les pages admin chargent déjà
 * les lignes, on évite un aller-retour réseau par changement de période.
 */

export interface PeriodRange {
  /** Date de début (YYYY-MM-DD), optionnelle. */
  from?: string;
  /** Date de fin (YYYY-MM-DD) — inclusive jusqu'à la fin de la journée. */
  to?: string;
}

export interface PeriodTotals {
  count: number;
  /** Somme par champ numérique configuré. */
  sums: Record<string, number>;
}

/**
 * Parse une valeur de date en timestamp, ou null si absente/invalide.
 * Accepte les chaînes ISO et les Date.
 */
function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** Fin de journée locale pour une date YYYY-MM-DD (23:59:59.999). */
function endOfDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** Début de journée locale pour une date YYYY-MM-DD (00:00:00.000). */
function startOfDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/**
 * Filtre les lignes dont le champ date est dans la période [from, to].
 * `from` inclusif (début de journée), `to` inclusif (fin de journée).
 */
export function filterByPeriod<T>(rows: T[], dateKey: keyof T & string, range: PeriodRange): T[] {
  const { from, to } = range;
  if (!from && !to) return rows;
  const minTs = from ? startOfDay(from) : -Infinity;
  const maxTs = to ? endOfDay(to) : Infinity;
  return rows.filter((row) => {
    const ts = toTimestamp(row[dateKey]);
    return ts !== null && ts >= minTs && ts <= maxTs;
  });
}

/**
 * Compte les lignes de la période et somme les champs numériques demandés.
 * Les valeurs non numériques (null, undefined, texte) sont ignorées dans les sommes.
 */
export function computePeriodTotals<T>(
  rows: T[],
  dateKey: keyof T & string,
  options: PeriodRange & { fields: string[] },
): PeriodTotals {
  const filtered = filterByPeriod(rows, dateKey, options);
  const sums: Record<string, number> = {};
  for (const field of options.fields) sums[field] = 0;
  for (const row of filtered) {
    for (const field of options.fields) {
      const v = (row as Record<string, unknown>)[field];
      if (typeof v === 'number' && Number.isFinite(v)) sums[field] += v;
    }
  }
  return { count: filtered.length, sums };
}
