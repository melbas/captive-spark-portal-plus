# FORGE — Studio de conception du portail

Inspiré du **Landing Page Designer d'UniFi** (panneau de configuration à gauche
+ preview live à droite), mais édite un **parcours complet** — pas une simple
splash page.

## Les trois couches

```
KIT     → quoi (la recette)      → onboarding en 1 clic
FORGE   → comment (le détail)    → design + flow + aperçu live
PORTAIL → l'exécution            → ce que le client vit
```

- **Kit** (`/admin/kits`) : point de départ pré-rempli. Pas un éditeur.
- **Forge** (`/admin/forge`) : personnalisation. Lit et écrit les **mêmes
  tables** que le Kit — une seule source de vérité.
- **Portail** (`/portal/:slug`) : exécute. Ne change pas.

Le Kit **ne remplace pas** la Forge : il pré-remplit ce que la Forge affine.
L'application d'un Kit redirige vers la Forge.

## Architecture technique

| Fichier | Rôle |
|---|---|
| `pages/admin/AdminForge.tsx` | Squelette : onglets, chargement, publication |
| `components/admin/forge/ForgeJourney.tsx` | Onglet Parcours (toggles + ↑↓) |
| `components/admin/forge/ForgeBranding.tsx` | Onglet Marque (logo, couleur, messages) |
| `components/admin/forge/ForgePreview.tsx` | Aperçu iframe + sélecteur d'étape |
| `pages/admin/AdminKits.tsx` | Catalogue Kits + application |
| `lib/admin/modules.ts` | Catalogue × activations, `portalUrl()` |
| `components/wifi-portal/useWifiPortal.ts` | Écoute `forge:goto-step` (preview) |

## Source de vérité unique

```
portal_config.flow_order        → ordre des préceptes actifs (jsonb)
portal_enabled_modules          → activations par site
portal_config (welcome, color…) → branding
portal_kits                     → catalogue d'onboarding
```

La Forge et les Kits écrivent dans ces tables. Jamais ailleurs, jamais en
double.

## Brouillon ≠ publié

Comme UniFi : on édite, on prévisualise, **on publie**.

- Badge de statut en haut de la Forge ("Brouillon non publié" / "Publié")
- L'édition reste en state local + debounced
- `Publier` écrit `flow_order` + upsert `portal_enabled_modules`
- L'aperçu utilise `?preview=1` (version éditée), le portail public reste
  sur l'ancienne jusqu'au clic

## Aperçu live

`portalUrl(origin, slug, draft=true)` → `/portal/:slug?preview=1`.

Le **sélecteur d'étape** (◄ ►) bascule l'étape courante du portail via
`postMessage` :

```
ForgePreview  →  iframe.contentWindow.postMessage({type: "forge:goto-step", step})
useWifiPortal →  window.addEventListener("message")  → setCurrentStep(Step)
```

C'est la différence avec UniFi : on prévisualise un **parcours entier**,
étape par étape, pas une page statique.

## Non-écrasement

Un Kit ne **jamais** écraser un travail manuel sans prévenir :

- 1re application → pré-remplissage simple
- Si `portal_enabled_modules` a déjà des lignes actives → **alerte de
  confirmation** "N préceptes seront remplacés"

Comptage via `existingCount` (query `head: true, count: exact`).

## Types Supabase non régénérés

`flow_order`, `kit_id` et la table `portal_kits` ne sont pas dans
`integrations/supabase/types.ts`. Deux contournements :

- `lib/supabase-untyped.ts` : client à base vide pour `portal_kits`
- casts `Record<string, unknown>` pour `flow_order`

**Dès que `supabase gen-types` est relancé** : supprimer `supabase-untyped.ts`
et revenir au client typé partout.
