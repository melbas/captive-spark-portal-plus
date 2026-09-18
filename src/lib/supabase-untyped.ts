/**
 * Client Supabase NON typé — pour les tables ajoutées après la dernière
 * génération de types (types.ts). Tant que `supabase gen-types` n'a pas été
 * relancé, `supabase.from('nouvelle_table')` est rejeté à la compilation
 * (TS2769/TS2589).
 *
 * Ce helper évite de re-caster partout (le pattern AdminAds casse à l'usage).
 * Usage :  const raw = untypedClient();
 *          const { data } = await raw.from('portal_kits').select('*');
 *
 * Dès que types.ts est régénéré, supprimer les appels et revenir au client
 * typé (`supabase`), qui valide les noms de tables et de colonnes.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Base vide : `from()` accepte n'importe quel nom de table. */
type EmptyDatabase = {
  Tables: Record<string, never>;
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

let cached: SupabaseClient<EmptyDatabase> | null = null;

export function untypedClient(): SupabaseClient<EmptyDatabase> {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants dans .env",
    );
  }
  cached = createClient<EmptyDatabase>(String(url), String(key));
  return cached;
}
