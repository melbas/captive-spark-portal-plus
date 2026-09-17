# RAPPORT PORTAIL — intégration front→DB, qualité, e2e

*Agent portail — septembre 2026. Périmètre respecté : `src/components/wifi-portal/**`, `src/components/ads/**`, `src/services/**`, `src/hooks/usePortalConfig.ts`, `e2e/`, `.github/`, `playwright.config.ts`, `docs/`. Aucun commit, aucune écriture DB, rien déployé.*

## 1. Inventaire (le contrat)

**`docs/INVENTAIRE-PORTAIL.md`** : inventaire exhaustif {élément, fichier:ligne, valeur actuelle, table/colonne cible, page admin, type de contrôle} couvrant les 4 slides pub, vidéo/audio pub, textes accueil FR/EN, couleurs/thème, contact support (WhatsApp banni), durées de session, points de départ, type d'engagement, méthodes d'auth (SMS/OTP, email, voucher), paiements (Wave/OM/voucher), modules parcours (quiz/jeux/récompenses/famille/parrainage) + liste de la dette hardcodée restante.

## 2. Changements

### `src/hooks/usePortalConfig.ts` (nouveau — hook de l'agent portail)
- Chargement par slug : `sites` + `portal_config` (statut `active` requis) + `portal_customizations` + `portal_enabled_modules` (join catalogue `portal_modules`) + `ad_videos`, séquentiel, tolérant RLS (lecture partielle → `source='demo-partial'`).
- **Typé sans `any`** : projections explicites (`SiteRow`, `PortalConfigRow`, `CustomizationRow`, `ModuleRow`, `EnabledModuleRow`, `AdVideoRow`) + builder minimal `LooseTable` qui coupe l'inférence du schéma généré à la source. **TS2589 résolu** (l'ancien `Promise.all` de builders PostgREST + `select("*")` explosait la profondeur d'inférence).
- Cache mémoire simple 60 s (`clearPortalConfigCache()` exporté), états `loading`/`error`/`source`.
- **Fail-closed** : sur un vrai site sans site/config publiée → `error` affichée, `enabledModules=null` ; defaults visuels uniquement en démo isolée (slug `demo`, `?demo=1`, racine).
- **Gating strict** : seule la ligne publiée (`portal_enabled_modules.is_enabled`) décide — plus de défaut `?? true` implicite côté admin.

### Portail riche branché
- `WifiPortalContainer.tsx` : slides depuis `ad_videos` (défauts `DEMO_AD_SLIDES` uniquement en démo), vidéo/audio par type déduit, textes/`supportContact`/`sessionMinutes`/`startingPoints`/`engagementType` depuis la config ; écran d'erreur fail-closed pour un vrai site sans config.
- `WifiPortalContent.tsx` : gating des modules par `portal.enabledModules` (`modules[key]===true`), **React.lazy + Suspense** sur `MiniGamesHub`, `FamilyManagement`, `ReferralSystem`, `RewardSystem`, `PaymentPortal`, `UserDashboard`, `AdminDashboard`, `ExtendTimeForWifi` (code-splitting du bundle 1,2 Mo).
- `ThemeMarketplace` : non rendu (code mort) → rien à lazy ; à fusionner côté admin (décision ANALYSE-CROISEE §2.1).

### Écritures sécurisées
- `user-service.ts` : flag `VITE_USE_EDGE_AUTH=true` → création du user via Edge **`verify-otp`** (le user est créé côté serveur) ; sinon insert client direct conservé pour démo/staging uniquement.
- `session-service.ts` : flag `VITE_USE_EDGE_SESSION=true` → Edge `authorize-guest` ; **flag désactivé par défaut** car `authorize-guest` n'a aujourd'hui NI authentification NI vérification de paiement (AUDIT-BACKEND C). Aucun appel sans contrat sécurisé — conformément à la consigne.
- `statistics-service.ts` : plus de read-modify-write client ; incrémentation via RPC `increment_statistic` (à créer côté backend) **en échec silencieux** (jamais cassé pour une stat).

### e2e & CI
- `playwright.config.ts` : projet `local` (baseURL `http://localhost:4173`, vite preview, déterministe) + projet `vercel` (staging/live, exécution manuelle `E2E_TARGET=vercel` seulement, ignoré par défaut).
- `e2e/portal-demo.spec.ts` : parcours démo complet déterministe — accueil → slides visibles → OTP `123456` → quiz → accès accordé → logos paiement Wave/Orange Money + bandeau « aucun paiement réel ».
- `.github/workflows/ci.yml` : install + `tsc --noEmit` + lint + build, puis job e2e **local uniquement** (jamais d'écriture Vercel/live en CI ; environnement de test e2e externe = le preview local du build, `E2E_TARGET=vercel` documenté pour un staging à provisionner).

## 3. Vérification

- `npx tsc -p tsconfig.app.json --noEmit` → **0 erreur** (état combiné avec l'agent admin, avant son échec ; revalidé après ma correction du hook : 0 erreur, hook sans `any`).
- `npm run build` : à relancer par l'orchestrateur sur l'état combiné final (l'état a bougé pendant l'exécution : l'agent admin a débordé sur `App.tsx` et le hook avant de tomber en panne de crédits).

## 4. Conflit signalé (pour l'orchestrateur)

L'agent admin a modifié mon hook (`src/hooks/usePortalConfig.ts`) en y posant des casts `as any` pour contourner TS2589, sans coordonner. J'ai repris sa structure et remplacé les `any` par des projections typées ; le fichier est désormais dans mon périmètre propre. Son rapport prétend « 0 erreur » — non valable sur l'état combiné à ce moment-là ; seul le tsc ci-dessus fait foi.

## 5. Ajouts nécessaires hors de mon périmètre (package.json / App.tsx / orchestrateur)

1. **`package.json`** : ajouter `@playwright/test` en devDependency + scripts :
   ```json
   "e2e": "playwright test --project=local",
   "e2e:staging": "E2E_TARGET=vercel playwright test --project=vercel"
   ```
2. **`App.tsx`** (déjà fait par l'agent admin, à valider) : route `/portal/:slug` → `WifiPortalContainer` ; `/` conserve le portail riche (fusion racine : décision Phase 1 ANALYSE-CROISEE §2.2, à trancher).
3. **Env Vercel/CI** : `VITE_USE_EDGE_AUTH=true` en prod (une fois les policies anon verrouillées), `E2E_*` pour le staging e2e.
4. **`.gitignore`** : `playwright-report/`, `test-results/`.

## 6. Ce que le BACKEND doit ajouter (bloquants / dettes)

1. **Policies RLS SELECT publiques** sur `sites`, `portal_config` (lignes actives), `portal_customizations`, `portal_enabled_modules`, `portal_modules`, `ad_videos` — sans elles le portail réel reste fail-closed à l'erreur.
2. **Edge `authorize-guest` sécurisé** (JWT obligatoire, vérification de la transaction/OTP, idempotence) avant d'activer `VITE_USE_EDGE_SESSION` — le parcours d'accès réel dépend de ce contrat.
3. **RPC `increment_statistic`** (SECURITY DEFINER) pour remplacer le silencieux-échec actuel.
4. **Colonne `ad_videos.type`** (image/video/audio) — le front déduit l'extension d'URL aujourd'hui.
5. **`portal_config`** : colonnes `ad_rotation_seconds`, `terms_url`, `privacy_url`.
6. **Tables `family_*`** ou masquage définitif du module famille (déjà masqué par défaut, fail-closed).
7. **Webhooks paiement Wave/OM** (HMAC fail-closed + idempotence) avant d'activer le paiement réel.
8. Sortie du bypass OTP : `DEV_OTP_MODE=false` + fournisseur SMS réel (Orange SMS API / agrégat local) — décision produit, pas un retrait de code.
9. P0 sécurité (AUDIT-BACKEND §D) : verrouiller les policies `with check (true)` de test, rate limiting OTP, chiffrement pgcrypto du secret UniFi.

## 7. Hardcodes restants (dette)

Voir `docs/INVENTAIRE-PORTAIL.md` §8 : défauts démo (bornés à la démo isolée), OTP `123456` (voulu jusqu'à la prod), couleur/logo lus mais non appliqués au CSS, interval rotation 7 s, famille en mock, logos paiement statiques, gestionnaires de thèmes non routés.
