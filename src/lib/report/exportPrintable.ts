/**
 * Export « PDF » par impression navigateur — décision de conception :
 * pas de jsPDF ni de dépendance lourde. On génère un HTML autonome stylé
 * pour l'impression (@media print, tableau zébré), on l'écrit dans une
 * fenêtre temporaire et on déclenche window.print(). L'utilisateur garde
 * « Enregistrer au format PDF » dans la boîte de dialogue d'impression.
 *
 * buildPrintableHTML est pure (testable) ; exportPrintable est l'effet DOM
 * avec window.open injectable pour les tests.
 */

export interface PrintableReport {
  title: string;
  columns: string[];
  /** Cellules déjà formatées (ex. « 1 000 FCFA »). */
  rows: string[][];
  /** Ligne optionnelle de synthèse sous le titre. */
  subtitle?: string;
}

/** Échappe les caractères HTML sensibles. */
function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Construit le document HTML imprimable autonome. */
export function buildPrintableHTML(report: PrintableReport): string {
  const head = report.columns.map((c) => `<th>${escapeHTML(c)}</th>`).join('');
  const body = report.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell)}</td>`).join('')}</tr>`)
    .join('\n');
  const subtitle = report.subtitle
    ? `<p class="subtitle">${escapeHTML(report.subtitle)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHTML(report.title)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #555; font-size: 13px; margin: 0 0 16px; }
  .meta { color: #777; font-size: 11px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  thead th { background: #f3f4f6; font-weight: 600; }
  tbody tr:nth-child(even) { background: #fafafa; }
  @media print {
    body { margin: 0; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${escapeHTML(report.title)}</h1>
${subtitle}
<p class="meta">Généré le ${new Date().toLocaleString('fr-FR')}</p>
<table>
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>`;
}

/**
 * Ouvre une fenêtre temporaire avec le rapport et déclenche l'impression.
 * Si window.open échoue (popup bloqué), ne fait rien plutôt que d'imprimer
 * la page courante.
 */
export function exportPrintable(report: PrintableReport, openWindow: typeof window.open = window.open.bind(window)): void {
  const win = openWindow('', '_blank');
  if (!win) return;
  win.document.write(buildPrintableHTML(report));
  win.document.close();
  win.focus();
  win.print();
}
