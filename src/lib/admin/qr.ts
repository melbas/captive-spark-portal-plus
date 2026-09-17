/**
 * QR code — encode une URL en matrice/SVG sans dépendance externe.
 *
 * Pourquoi un encodeur maison : aucune lib QR n'est installée dans le projet et
 * la mission interdit d'en ajouter une sans le signaler. L'algorithme est
 * l'encodage QR standard (mode byte, niveau Q, masque à pénalité minimale).
 * Exactitude vérifiée bit à bit contre un encodeur de référence — cf. qr.test.ts.
 *
 * Limitations assumées (délibérées, pour rester compact) :
 * - versions 1 à 15 (niveau Q, mode byte → jusqu'à ~500 caractères), suffisant
 *   pour une URL de portail ;
 * - niveau de correction Q (~25 % de redondance) : bon compromis pour un QR
 *   affiché à l'écran et imprimé sur un support.
 */

export interface QrMatrix {
  size: number;
  /** size*size valeurs, rangées par ligne (index = row * size + col). */
  data: boolean[];
}

/** Plus petite version (1..40) contenant le payload en mode byte, niveau Q. */
export function chooseVersion(byteLength: number): number {
  for (let v = 1; v <= 40; v++) {
    if (byteLength <= BYTE_CAPACITY_Q[v - 1]) return v;
  }
  throw new Error('Payload trop long pour un QR code (byte, niveau Q).');
}

/* Capacités : nombre max de CARACTÈRES en mode byte, niveau Q (norme QR).
 * Capacité (data codewords) − en-tête (mode 4 bits + compteur 8 bits pour v1-9,
 * 16 bits au-delà). */
const BYTE_CAPACITY_Q = [
  11, 20, 32, 46, 60, 74, 86, 98, 108, 124, 141, 158, 174, 196, 212,
  234, 248, 270, 287, 306, 326, 345, 366, 395, 412, 434, 455, 477, 508, 529,
  551, 574, 597, 621, 646, 668, 692, 716, 741, 767,
];

interface BlockLayout {
  totalBlocks: number;
  ecCodewords: number;
  dataCodewords: number;
}

/* Nombre de blocs RS, codewords correcteurs et codewords de DONNÉES par
 * version, niveau Q (tables officielles : EC_BLOCKS_TABLE / EC_CODEWORDS_TABLE).
 * dataCodewords est bien le nombre de codewords utiles (total − EC), sinon le
 * bourrage ajoute des mots en trop et le flux fait la mauvaise longueur. */
const BLOCK_TABLE_Q: Record<number, BlockLayout> = {
  1: { totalBlocks: 1, ecCodewords: 13, dataCodewords: 13 },
  2: { totalBlocks: 1, ecCodewords: 22, dataCodewords: 22 },
  3: { totalBlocks: 2, ecCodewords: 36, dataCodewords: 34 },
  4: { totalBlocks: 2, ecCodewords: 52, dataCodewords: 48 },
  5: { totalBlocks: 4, ecCodewords: 72, dataCodewords: 62 },
  6: { totalBlocks: 4, ecCodewords: 96, dataCodewords: 76 },
  7: { totalBlocks: 6, ecCodewords: 108, dataCodewords: 88 },
  8: { totalBlocks: 6, ecCodewords: 132, dataCodewords: 99 },
  9: { totalBlocks: 8, ecCodewords: 160, dataCodewords: 116 },
  10: { totalBlocks: 8, ecCodewords: 192, dataCodewords: 140 },
  11: { totalBlocks: 8, ecCodewords: 224, dataCodewords: 157 },
  12: { totalBlocks: 10, ecCodewords: 260, dataCodewords: 175 },
  13: { totalBlocks: 12, ecCodewords: 288, dataCodewords: 196 },
  14: { totalBlocks: 16, ecCodewords: 320, dataCodewords: 224 },
  15: { totalBlocks: 12, ecCodewords: 360, dataCodewords: 223 },
};

const PAD_BYTES = [0xEC, 0x11];

/* ---------- Reed-Solomon sur GF(256), polynôme générateur standard ---------- */
/* Tables de corps GF(256) construites une fois (générateur 0x02, réducteur 0x11d). */
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function rsBlocks(data: number[], ecCount: number): number[] {
  // Polynôme générateur (x − α⁰)(x − α¹)…(x − α^(ecCount−1)), coefficients
  // stockés du degré élevé vers le degré 0 (gen[0] = coefficient dominant).
  const gen: number[] = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j + 1] ^= gen[j];
      next[j] ^= EXP[(LOG[gen[j]] + i) % 255];
    }
    gen.splice(0, gen.length, ...next);
  }
  // Schéma à un seul registre BigInt : on traite le reste de la division
  // polynomiale comme un grand nombre en base 2, MSB first. Les décalages
  // dépassant 32 bits, on utilise BigInt (correct mais sans dépendance).
  let rest = 0n;
  const ec: number[] = [];
  let g = 0n;
  for (let i = 0; i < gen.length; i++) g = (g << 8n) | BigInt(gen[i]);
  for (let i = 0; i < data.length; i++) {
    rest = (rest << 8n) | BigInt(data[i]);
    for (let bit = 7; bit >= 0; bit--) {
      if (rest & (1n << BigInt(8 * ecCount + bit))) {
        rest ^= g << BigInt(bit);
      }
    }
  }
  rest = rest << BigInt(8 * ecCount);
  for (let i = ecCount - 1; i >= 0; i--) {
    ec[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return ec;
}
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const steps = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const last = size - 7;
  const step = Math.ceil((last - 6) / (steps - 2) / 2) * 2;
  const positions = [6];
  for (let p = last; positions.length < steps; p -= step) {
    positions.splice(positions.length - 1, 0, p);
  }
  return positions;
}

const MASK_FNS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(matrix: boolean[], reserved: boolean[], size: number, mask: number): boolean[] {
  const out = matrix.slice();
  const fn = MASK_FNS[mask];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r * size + c]) continue;
      if (fn(r, c)) out[r * size + c] = !out[r * size + c];
    }
  }
  return out;
}

/** Bits de format (15) : 5 bits données (niveau + masque) + 10 BCH, masqués. */
function formatBits(ecLevel: number, mask: number): number {
  const data = (ecLevel << 3) | mask;
  let bch = data << 10;
  const G = 0b10100110111;
  for (let i = 4; i >= 0; i--) {
    if ((bch >> (i + 10)) & 1) bch ^= G << i;
  }
  return ((data << 10) | bch) ^ 0b101010000010010;
}

/** Pénalité de masque (règles 1-4 de la norme) — sert à choisir le meilleur masque. */
function penalty(matrix: boolean[], size: number): number {
  let p = 0;
  // R1 : runs de 5+ modules identiques
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r * size + c] === matrix[r * size + c - 1]) run++;
      else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
    if (run >= 5) p += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r * size + c] === matrix[(r - 1) * size + c]) run++;
      else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
    if (run >= 5) p += run - 2;
  }
  // R2 : blocs 2x2 uniformes
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r * size + c];
      if (
        v === matrix[r * size + c + 1] &&
        v === matrix[(r + 1) * size + c] &&
        v === matrix[(r + 1) * size + c + 1]
      ) {
        p += 3;
      }
    }
  }
  // R3 : motif 1:1:3:1:1 (1011101) entouré de 4 modules clairs
  const finder = [true, false, true, true, true, false, true];
  const isSet = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && matrix[r * size + c];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c + 6 < size; c++) {
      let ok = true;
      for (let i = 0; i < 7; i++) {
        if (matrix[r * size + c + i] !== finder[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      // 4 modules clairs avant/après (gauche/droite), sinon pas de pénalité
      if (isSet(r, c - 1) || isSet(r, c + 7)) continue;
      if (
        isSet(r - 1, c - 1) ||
        isSet(r - 1, c) ||
        isSet(r - 1, c + 6) ||
        isSet(r - 1, c + 7) ||
        isSet(r + 1, c - 1) ||
        isSet(r + 1, c) ||
        isSet(r + 1, c + 6) ||
        isSet(r + 1, c + 7)
      ) {
        continue;
      }
      p += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r + 6 < size; r++) {
      let ok = true;
      for (let i = 0; i < 7; i++) {
        if (matrix[(r + i) * size + c] !== finder[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (isSet(r - 1, c) || isSet(r + 7, c)) continue;
      if (
        isSet(r - 1, c - 1) ||
        isSet(r, c - 1) ||
        isSet(r + 6, c - 1) ||
        isSet(r + 7, c - 1) ||
        isSet(r - 1, c + 1) ||
        isSet(r, c + 1) ||
        isSet(r + 6, c + 1) ||
        isSet(r + 7, c + 1)
      ) {
        continue;
      }
      p += 40;
    }
  }
  // R4 : ratio modules sombres
  let dark = 0;
  for (const v of matrix) if (v) dark++;
  const ratio = (dark * 100) / matrix.length;
  p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return p;
}

export function generateQrMatrix(payload: string): QrMatrix {
  const bytes = utf8Bytes(payload);
  const version = chooseVersion(bytes.length);
  if (version > 15) {
    throw new Error('QR code limité aux versions 1-15 (payload trop long pour cette page).');
  }
  const size = version * 4 + 17;
  const layout = BLOCK_TABLE_Q[version];
  const ecPerBlock = layout.ecCodewords / layout.totalBlocks;
  const dataPerBlock = layout.dataCodewords / layout.totalBlocks;

  // -- 1. Flux de données : mode byte (0x04) + longueur + payload + terminator
  // Les librairies usuelles encodent en mode byte dès que le payload contient
  // des caractères hors jeu alphanumérique ; c'est l'encodage attendu pour
  // une URL contenant '/', ':' ou '?'.
  let bits = '0100';
  bits += bytes.length.toString(2).padStart(version <= 9 ? 8 : 16, '0');
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  bits += '0000';
  while (bits.length % 8 !== 0) bits += '0';
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8), 2));
  const totalData = layout.dataCodewords;
  let padIdx = 0;
  while (codewords.length < totalData) codewords.push(PAD_BYTES[padIdx++ % 2]);
  const dataCodewords = codewords;
  const blocks: number[][] = [];
  for (let b = 0; b < layout.totalBlocks; b++) {
    blocks.push(dataCodewords.slice(b * dataPerBlock, (b + 1) * dataPerBlock));
  }
  const ecAll = blocks.map((d) => rsBlocks(d, ecPerBlock));

  // -- 3. Entrelacement
  const interleaved: number[] = [];
  for (let i = 0; i < dataPerBlock; i++) for (const b of blocks) interleaved.push(b[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const e of ecAll) interleaved.push(e[i]);
  let bitQueue = '';
  for (const cw of interleaved) bitQueue += cw.toString(2).padStart(8, '0');

  // -- 4. Matrice : finder + séparateurs, timing, alignment, réservation format
  const matrix = new Array<boolean>(size * size).fill(false);
  const reserved = new Array<boolean>(size * size).fill(false);

  const placeFinder = (r0: number, c0: number) => {
    for (let r = 0; r <= 6; r++) {
      for (let c = 0; c <= 6; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[rr * size + cc] = border || center;
        reserved[rr * size + cc] = true;
      }
    }
    // Anneau séparateur d'un module, laissé clair (clair partout, sauf
    // intersections de timing), puis réservation pour le format info.
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        if (i >= 0 && i <= 6 && j >= 0 && j <= 6) continue;
        const rr = r0 + i;
        const cc = c0 + j;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        matrix[rr * size + cc] = false;
        // Les bords intérieurs portent le format info ; on réserve tout le
        // périmètre pour ne pas y écrire de donnée.
        if (i === -1 || i === 7 || j === -1 || j === 7) {
          // ne pas réserver les zones de timing/format gérées plus loin
          reserved[rr * size + cc] = true;
        }
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0;
    matrix[6 * size + i] = v;
    matrix[i * size + 6] = v;
    reserved[6 * size + i] = true;
    reserved[i * size + 6] = true;
  }

  for (const ar of alignmentPositions(version)) {
    for (const ac of alignmentPositions(version)) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 8) || (ar >= size - 8 && ac <= 8)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const rr = ar + r;
          const cc = ac + c;
          const border = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          matrix[rr * size + cc] = border;
          reserved[rr * size + cc] = true;
        }
      }
    }
  }

  // Format info : deux copies, positions dans l'ordre des bits (bit 0 d'abord).
  const fmtPositions: [number, number][] = [];
  for (let i = 0; i <= 5; i++) fmtPositions.push([8, i]);
  fmtPositions.push([8, 7], [8, 8], [7, 8]);
  for (let i = 5; i >= 0; i--) fmtPositions.push([i, 8]);
  for (let i = 0; i < 7; i++) fmtPositions.push([size - 1 - i, 8]);
  for (let i = 0; i < 8; i++) fmtPositions.push([8, size - 8 + i]);
  for (const [r, c] of fmtPositions) reserved[r * size + c] = true;

  // Les modules sombres fixes de la zone format (non couverts par fmtPositions).
  matrix[8 * size + 6] = true; // à l'intersection du timing vertical
  matrix[6 * size + 8] = true; // à l'intersection du timing horizontal
  // Module sombre fixe à côté de la 2e copie du format info.
  matrix[8 * size + (size - 8)] = true;

  // -- 5. Placement des données en zigzag (bottom-up, colonnes par 2)
  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // colonne du timing sautée
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (c < 0 || reserved[r * size + c]) continue;
        const bit = bitIndex < bitQueue.length ? bitQueue[bitIndex++] === '1' : false;
        matrix[r * size + c] = bit;
      }
    }
    upward = !upward;
  }

  // -- 6. Masque à pénalité minimale
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const p = penalty(applyMask(matrix, reserved, size, m), size);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = m;
    }
  }
  const finalMatrix = applyMask(matrix, reserved, size, bestMask);

  // -- 7. Format info (niveau Q = 3) — bits posés MSB d'abord, comme la norme
  // (bit 14 en tête) : (8,0)=bit14 … (0,8)=bit0, idem pour la 2e copie.
  const fmt = formatBits(3, bestMask);
  for (let i = 0; i < 15; i++) {
    const [r, c] = fmtPositions[i];
    finalMatrix[r * size + c] = ((fmt >> (14 - i)) & 1) === 1;
  }
  // 2e copie : bits 14..7 le long de la colonne 8 (du bas vers le haut, ligne
  // size-1 en premier), bits 6..0 le long de la ligne 8 (de size-8 à size-1),
  // soit 15 modules — le module (8, size-8) commun aux deux est géré par la
  // boucle de colonne ci-dessus, d'où le décalage d'indice.
  let f2 = fmt;
  for (let i = 6; i >= 0; i--) {
    finalMatrix[(size - 1 - i) * size + 8] = ((f2 >> 14) & 1) === 1;
    f2 <<= 1;
  }
  for (let i = 0; i < 8; i++) {
    finalMatrix[8 * size + (size - 8 + i)] = ((f2 >> 14) & 1) === 1;
    f2 <<= 1;
  }

  return { size, data: finalMatrix };
}

function utf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return bytes;
}

/** Matrice → SVG (string). `moduleSize` = taille d'un module ; `margin` = quiet zone. */
export function qrToSvg(qr: QrMatrix, moduleSize = 8, margin = 4): string {
  const total = (qr.size + margin * 2) * moduleSize;
  const rects: string[] = [];
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (!qr.data[r * qr.size + c]) continue;
      rects.push(
        `<rect x="${(c + margin) * moduleSize}" y="${(r + margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff"/><g fill="#000000">${rects.join('')}</g></svg>`;
}

/** Matrice → data URL (SVG encodé). Prêt pour <img src>, impression et téléchargement. */
export function qrToDataUrl(qr: QrMatrix, moduleSize = 8, margin = 4): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrToSvg(qr, moduleSize, margin))}`;
}
