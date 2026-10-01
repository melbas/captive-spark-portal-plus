#!/usr/bin/env node
/**
 * Génère src/generated/version.ts à partir des infos git + package.json.
 *
 * Sorties exportées :
 *   APP_VERSION : version SemVer lue dans package.json (source de vérité humaine)
 *   GIT_COMMIT  : court hash du commit courant (git describe --tags --always --dirty,
 *                 suffixe "-dirty" retiré pour l'affichage)
 *   BUILD_DATE  : date du build au format YYYY-MM-DD
 *
 * Fallback si git est absent ou échoue : GIT_COMMIT = "unknown".
 * Branché en `prebuild` npm (exécuté automatiquement avant `npm run build`).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const APP_VERSION = pkg.version || '0.0.0';

let GIT_COMMIT = 'unknown';
try {
  const describe = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  // On retire le suffixe "-dirty" : la date du build suffit à distinguer deux
  // builds d'un même commit, et un hash sale reste un hash valide.
  GIT_COMMIT = describe.replace(/-dirty$/, '') || 'unknown';
} catch {
  // git absent (ex: build hors clone) → fallback package.json déjà appliqué.
}

const BUILD_DATE = new Date().toISOString().slice(0, 10);

const out = `// Fichier généré par scripts/version.mjs — NE PAS ÉDITER À LA MAIN.
// Régénéré à chaque build via \`npm run prebuild\`.

export const APP_VERSION = ${JSON.stringify(APP_VERSION)};
export const GIT_COMMIT = ${JSON.stringify(GIT_COMMIT)};
export const BUILD_DATE = ${JSON.stringify(BUILD_DATE)};
`;

const target = resolve(root, 'src/generated/version.ts');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out);
console.log(`[version] APP_VERSION=${APP_VERSION} GIT_COMMIT=${GIT_COMMIT} BUILD_DATE=${BUILD_DATE}`);
