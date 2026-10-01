import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildPrintableHTML, exportPrintable } from './exportPrintable';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildPrintableHTML', () => {
  it('génère un document HTML complet avec titre, colonnes et lignes', () => {
    const html = buildPrintableHTML({
      title: 'Transactions – Site X',
      columns: ['Montant', 'Méthode', 'Date'],
      rows: [
        ['1 000 FCFA', 'wave', '2026-09-01'],
        ['2 500 FCFA', 'om', '2026-09-15'],
      ],
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Transactions – Site X');
    expect(html).toContain('<th>Montant</th>');
    expect(html).toContain('<td>1 000 FCFA</td>');
    expect(html).toContain('<td>2 500 FCFA</td>');
  });

  it('échappe le HTML dans le titre, les colonnes et les cellules', () => {
    const html = buildPrintableHTML({
      title: 'Rapport <b>gras</b>',
      columns: ['Nom'],
      rows: [['<script>alert(1)</script>']],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('Rapport <b>gras</b>');
    expect(html).toContain('Rapport &lt;b&gt;gras&lt;/b&gt;');
  });

  it('gère un jeu de lignes vide', () => {
    const html = buildPrintableHTML({ title: 'Vide', columns: ['A'], rows: [] });
    expect(html).toContain('<th>A</th>');
    expect(html).not.toContain('<td>');
  });
});

describe('exportPrintable', () => {
  it('ouvre une fenêtre, écrit le HTML et déclenche window.print()', () => {
    const write = vi.fn();
    const print = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const win = { document: { write, close }, focus, print, closed: false } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(win);

    exportPrintable({ title: 'Rapport', columns: ['A'], rows: [['1']] });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toContain('<!DOCTYPE html>');
    expect(print).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("n'imprime rien si window.open échoue (popup bloqué)", () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const printSpy = vi.spyOn(window, 'print');
    exportPrintable({ title: 'X', columns: ['A'], rows: [['1']] });
    expect(printSpy).not.toHaveBeenCalled();
  });
});
