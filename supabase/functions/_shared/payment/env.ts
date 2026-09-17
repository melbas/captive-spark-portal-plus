// Lecture des variables d'environnement — Deno en production, Node en tests.
// Permet aux modules de logique (mapping, signatures, sélection provider)
// d'être testés hors runtime Deno sans importer le SDK Supabase.

type GlobalEnv = {
  Deno?: { env: { get: (key: string) => string | undefined } };
  process?: { env: Record<string, string | undefined> };
};

const g: GlobalEnv = globalThis as unknown as GlobalEnv;

export function getEnv(key: string): string | undefined {
  if (typeof g.Deno !== "undefined" && g.Deno?.env?.get) {
    return g.Deno.env.get(key);
  }
  if (typeof g.process !== "undefined" && g.process?.env) {
    return g.process.env[key];
  }
  return undefined;
}

/**
 * Résout une variable OBLIGATOIRE — lance si absente (fail-closed).
 * Utilisée pour les secrets qui doivent bloquer la fonction.
 */
export function requireEnv(key: string): string {
  const v = getEnv(key);
  if (!v) throw new EnvError(`Secret manquant: ${key}`);
  return v;
}

export class EnvError extends Error {}

/**
 * Tests uniquement : injecte un environnement déterministe.
 * Sans effet en runtime Deno (les secrets viennent du serveur).
 */
export function __setEnvForTests(map: Record<string, string>): void {
  if (typeof g.process !== "undefined" && g.process?.env) {
    for (const [k, v] of Object.entries(map)) g.process.env[k] = v;
  } else if (typeof g.Deno !== "undefined") {
    for (const [k, v] of Object.entries(map)) g.Deno.env.set(k, v);
  }
}
