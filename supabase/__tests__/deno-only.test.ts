// ⚠️ Les Edge Functions de ce dossier (supabase/functions/**) tournent sur le
// runtime Deno (imports https://esm.sh, Deno.env, Deno.serve) et ne peuvent
// PAS être exécutées par vitest/Node.
//
// Les tests de provision-access vivent dans supabase/__tests__/ et
// s'exécutent avec :
//   deno test --allow-env --allow-net supabase/__tests__/
// (deno est requis : https://deno.land ; DENO_TEST=1 inutile ici, le test
// configure lui-même l'environnement.)
//
// `npm run test:ci` (vitest) exclut déjà supabase/** — voir package.json.
// Ce fichier existe uniquement pour que `vitest run` ne remonte pas ce
// dossier comme suite vide : il ne contient aucun test exécutable par vitest.
import { it, expect } from "vitest";

it("les tests Edge Functions s'exécutent via deno test (voir supabase/__tests__/README.md)", () => {
  expect(true).toBe(true);
});
