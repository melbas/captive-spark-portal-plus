/**
 * Export CSV générique côté client.
 *
 * Construit un CSV (en-têtes depuis les clés du premier objet) et déclenche
 * un téléchargement via un Blob + lien temporaire. Logique pure (toCSV)
 * séparée de l'effet DOM (exportCSV) pour rester testable.
 */

/** Échappe une valeur pour le CSV : guillemets si séparateur/guillemet/retour ligne. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else if (typeof value === 'object') str = JSON.stringify(value);
  else str = String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Sérialise des enregistrements en CSV : en-têtes = clés du premier objet. */
export function toCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escapeHeader = (h: string) => csvEscape(h);
  const rows = data.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  return [headers.map(escapeHeader).join(','), ...rows].join('\n');
}

/** Génère un CSV et déclenche son téléchargement (fichier .csv). */
export function exportCSV<T extends Record<string, unknown>>(data: T[], filename: string): void {
  const csv = toCSV(data);
  if (!csv) return;

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
