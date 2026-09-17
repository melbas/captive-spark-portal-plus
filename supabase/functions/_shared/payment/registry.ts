/**
 * Registre des providers + mécanisme de SÉLECTION.
 *
 * Ordre de résolution (premier gagnant) :
 *   1. `sites.payment_provider` (par site) — un site peut choisir son provider
 *      depuis le back office (AdminSites). Valeurs : `bictorys` | `wave` | `orange`.
 *   2. `PAYMENT_PROVIDER` (env global, Edge) — défaut global.
 *   3. `bictorys` (provider principal — décision produit 2026-09-17).
 *
 * Fail-closed : si le provider choisi n'a pas ses secrets configurés, on NE
 * bascule PAS silencieusement sur un autre provider (une charge créée chez un
 * provider inattendu = divergence de comptabilité). On renvoie une erreur
 * typée `invalidConfig` → HTTP 503 côté `create-charge`.
 *
 * SÉPARATION VOLONTAIRE : ce module NE CHARGE AUCUN provider concret (pas
 * d'import des implémentations, donc pas d'import réseau esm.sh). Il reste
 * ainsi entièrement testable en Node sans connexion réseau. L'assemblage des
 * providers réels se fait dans `providers/index.ts` (utilisé par les Edge
 * Functions en production uniquement).
 */

import type { PaymentProvider, TransactionStatus } from "./provider.ts";
import { PaymentProviderError } from "./provider.ts";
import { getEnv } from "./env.ts";

export type ProviderId = "bictorys" | "wave" | "orange";

/** Provider par défaut (décision produit : Bictorys principal). */
export const DEFAULT_PROVIDER: ProviderId = "bictorys";

/**
 * Registre des providers. Vide par défaut ; rempli par
 * `providers/index.ts` au démarrage des Edge Functions (Deno).
 * Les tests unitaires n'ont PAS besoin de l'initialiser pour tester
 * `selectProvider` : on peut injecter un registre minimal.
 */
const REGISTRY = new Map<string, PaymentProvider>();

/** Enregistre les implémentations providers (Edge Functions, runtime Deno). */
export function registerProvider(provider: PaymentProvider): void {
  REGISTRY.set(provider.id, provider);
}

/** Enregistre un jeu de providers — alias groupé (production). */
export function registerProviders(providers: PaymentProvider[]): void {
  for (const p of providers) registerProvider(p);
}

/**
 * Sélection du provider applicable à un site.
 *
 * @param envValue valeur de `PAYMENT_PROVIDER` (secret Edge global)
 * @param siteProvider valeur optionnelle de `sites.payment_provider`
 * @returns provider sélectionné (jamais null)
 */
export function selectProvider(
  envValue: string | undefined,
  siteProvider: string | null | undefined,
): PaymentProvider {
  const candidate = (siteProvider || envValue || DEFAULT_PROVIDER).trim().toLowerCase();
  const provider = REGISTRY.get(candidate);
  if (!provider) {
    throw new PaymentProviderError(
      `Provider de paiement inconnu : "${candidate}" (attendu : bictorys | wave | orange)`,
      { invalidConfig: true },
    );
  }
  return provider;
}

/**
 * Vérifie que les secrets du provider sont présents — fail-closed.
 * Appelé par `create-charge` AVANT d'écrire en base.
 *
 * `envLookup` n'est là QUE pour les tests unitaires (éviter un stub Deno
 * global) ; en production c'est `Deno.env.get` / `getEnv`.
 */
export function assertProviderConfigured(
  provider: PaymentProvider,
  envLookup: (key: string) => string | undefined = getEnv,
): void {
  const missing = provider
    .requiredSecrets()
    .filter((s) => !envLookup(s));
  if (missing.length > 0) {
    throw new PaymentProviderError(
      `${provider.id} : secrets manquants (${missing.join(", ")}) — configuration backend incomplète`,
      { invalidConfig: true },
    );
  }
}

/** Mapping statut provider → statut interne canonique (helper webhooks). */
export function mapProviderStatus(provider: PaymentProvider, raw: string): TransactionStatus {
  return provider.mapStatus ? provider.mapStatus(raw) : "pending";
}
