import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toCSV, exportCSV } from './exportCSV';

interface Row {
  id: string;
  name: string;
  points: number;
  blocked: boolean;
}

const rows: Row[] = [
  { id: 'u1', name: 'Alice', points: 120, blocked: false },
  { id: 'u2', name: 'Bob, Jr.', points: 0, blocked: true },
];

describe('toCSV', () => {
  it('génère les en-têtes depuis les clés du premier objet', () => {
    const csv = toCSV(rows);
    const [header] = csv.split('\n');
    expect(header).toBe('id,name,points,blocked');
  });

  it('génère une ligne par enregistrement, dans l\'ordre', () => {
    const csv = toCSV(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('u1,Alice,120,false');
  });

  it('échappe les valeurs contenant une virgule avec des guillemets', () => {
    const csv = toCSV(rows);
    expect(csv.split('\n')[2]).toBe('u2,"Bob, Jr.",0,true');
  });

  it('échappe les guillemets doubles en les doublant', () => {
    const csv = toCSV([{ id: 'x', name: 'a "b" c', points: 1, blocked: false }]);
    expect(csv.split('\n')[1]).toBe('x,"a ""b"" c",1,false');
  });

  it('retourne une chaîne vide pour un tableau vide', () => {
    expect(toCSV([])).toBe('');
  });

  it('sérialise les valeurs nulles/undefined en chaîne vide', () => {
    const csv = toCSV([{ id: 'u3', name: null, points: undefined, blocked: false }]);
    expect(csv.split('\n')[1]).toBe('u3,,,false');
  });
});

describe('exportCSV', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let appended: HTMLAnchorElement[];

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    clickSpy = vi.fn();
    appended = [];

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
    vi.spyOn(document.body, 'appendChild').mockImplementation(((node: Node) => {
      appended.push(node as HTMLAnchorElement);
      return node;
    }) as typeof document.body.appendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(((node: Node) => node) as typeof document.body.removeChild);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('déclenche un téléchargement .csv avec le bon contenu', () => {
    exportCSV(rows, 'utilisateurs');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const link = appended[0] as HTMLAnchorElement;
    expect(link.download).toBe('utilisateurs.csv');
    expect(link.href).toBe('blob:mock-url');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('n\'ajoute pas de double extension si le nom finit déjà par .csv', () => {
    exportCSV(rows, 'rapport.csv');
    expect((appended[0] as HTMLAnchorElement).download).toBe('rapport.csv');
  });

  it('ne fait rien pour un tableau vide', () => {
    exportCSV([], 'vide');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
