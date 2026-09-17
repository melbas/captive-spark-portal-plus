/**
 * Assemblage des providers RÉELS — runtime Deno uniquement.
 *
 * `registry.ts` est volontairement libre de tout import concret (donc
 * d'import réseau esm.sh) pour rester testable en Node sans connexion.
 * Les Edge Functions appellent ce module UNE fois au démarrage pour
 * enregistrer les implémentations :
 *
 *   import { registerAllProviders } from "../_shared/payment/providers/index.ts";
 *   registerAllProviders();
 */

import { registerProviders } from "../registry.ts";
import { bictorysProvider } from "./bictorys.ts";
import { waveProvider } from "./wave.ts";
import { orangeProvider } from "./orange.ts";

export function registerAllProviders(): void {
  registerProviders([bictorysProvider, waveProvider, orangeProvider]);
}

export { bictorysProvider, waveProvider, orangeProvider };
