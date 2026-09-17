# RAPPORT — Back office : fondations multi-tenant & pages pilotantes

*Branche `dev`, aucun commit/push effectué. Période : mission back office (fondations + pages Sites / Modules / Forfaits).*

## 1. Choix de framework (build vs reuse)

**Décision : option (a) — garder le socle shadcn/Tailwind + TanStack Query existant, sans migration.**
Motivation complète dans [DECISION-ADMIN-FRAMEWORK.md](./DECISION-ADMIN-FRAMEWORK.md). En résumé :

1. Le principe validé « le back office garde le design du portail (mêmes tokens) » est incompatible avec (c) shadcn-admin (autre layout, autres tokens) et pénalisé par (b) Refine (conventions de pages/resources à réconcilier).
2. Les manques (édition sites, toggles modules, CRUD forfaits) sont des manques de **pages et de données**, pas de framework ; TanStack Query + react-hook-form sont déjà là.
3. Le modèle multi-tenant (sélecteur de site global filtrant TOUTES les pages, site_manager verrouillé) n'est fourni par aucun des deux frameworks : à construire à la main de toute façon — donc autant le construire dans notre socle.
4. **En échange (accepté)** : pas de CRUD généré (3 formulaires écrits à la main, OK à cette échelle) ; chaque page applique explicitement son filtre `site_id` (visible et vérifiable en relecture) ; TanStack Table n'est ajouté que si tri/pagination serveur devient nécessaire.

## 2. Ce qui est livré

### Fondations
- **`src/context/SiteContext.tsx` + `src/lib/admin/site-context.ts` (+ tests)** : contexte global « site courant ». Sélecteur en haut du layout, persisté (localStorage `admin-current-site-id`), filtre toutes les pages via `useCurrentSite()`. `site_manager` est **verrouillé** sur son site (sélecteur désactivé, icône cadenas).
- **Rôles intégrés à `src/hooks/useAdminAuth`** (avec `src/lib/admin/roles.ts` + tests) : `super_admin` / `reseller` / `site_manager` / `viewer`, mapping du rôle legacy `admin` → `super_admin`, `navItemsForRole()` masque les entrées de menu non autorisées, `canEdit`/`canEditSite` pour le lecture-seule.
- **`src/components/admin/AdminLayout.tsx`** : responsive (sidebar 280 px desktop, drawer `Sheet` mobile avec hamburger), sélecteur de site en header, fil d'Ariane (shadcn Breadcrumb), déconnexion et profil en bas de sidebar.
- **`src/components/admin/HelpTip.tsx`** : aide contextuelle réutilisable, deux variantes (infobulle `Popover` sur ℹ️ et encart « banner »), français simple sans jargon. Utilisée sur les trois nouvelles pages et leurs champs techniques.
- **Câblage** : `SiteProvider` monté sur la route `/admin` dans `src/App.tsx`, routes `/admin/modules` et `/admin/plans` ajoutées (entrées de menu déjà présentes dans AdminLayout).

### Page SITES (`src/pages/admin/AdminSites.tsx`) — complète
- Édition de **tous** les champs : nom, type (libellés FR), localisation, `welcome_msg`, activation (Switch).
- **Logo** : upload Supabase Storage (bucket `site-assets`, chemin `sites/<id>/`, public URL, max 2 Mo, aperçu + « retirer »).
- **Couleur principale** : color picker natif (`input[type=color]`) + champ hexa synchronisé.
- **Lien copiable** `/portal/<slug>` (bouton avec retour « Copié »).
- **Aperçu live** : iframe dans une maquette téléphone à côté du formulaire, pointée sur `/portal/<slug>?preview=1`, rechargée à l'enregistrement (boutons rafraîchir / nouvel onglet).

### Page MODULES DU PARCOURS (`src/pages/admin/AdminModules.tsx`) — nouvelle
- Grille de cartes par site alimentée par `portal_modules` (catalogue, 12 modules seedés) × `portal_enabled_modules` (activation par site, rattachées au `portal_config` du site — créé à la volée si absent).
- UI non-technique : **icône lucide + nom simple + description courte + toggle Switch**, badge « X activé(s) sur Y », carte surlignée quand activée, catégorisation FR (Connexion / Divertissement / Business).
- Fusion catalogue × activations et mapping d'icônes testés dans `src/lib/admin/modules.ts`.

### Page FORFAITS (`src/pages/admin/AdminPlans.tsx`) — nouvelle
- CRUD complet `wifi_plans` filtré par `site_id` : nom, description, durée (min), **prix FCFA**, débits ↓/↑, data (vide = illimitée), max devices, badge « populaire », ordre d'affichage, activation.
- Liste triée (ordre + populaire en premier), Switch d'activation en ligne, dialogue créer/éditer (validation : nom requis, durée > 0, prix ≥ 0), dialogue de suppression avec garde-fou (« désactivez-le plutôt »).
- Formatage FR (`formatFcfa`, `formatDuration`) et tri/validations testés dans `src/lib/admin/plans.ts`.

### Rapports & décisions
- `docs/DECISION-ADMIN-FRAMEWORK.md` : étude (a)/(b)/(c) + décision motivée.

## 3. Vérifications

- `npx tsc -p tsconfig.app.json --noEmit` → **0 erreur** (un TS2589 pré-existant dans `usePortalConfig.ts` a été contourné : cast `any` sur `from()` pour couper une inférence de chaîne PostgREST trop profonde — sémantique inchangée).
- `npm run build` → ✅ (avertissement de taille de chunk pré-existant).
- Tests unitaires (`npx tsx --test src/lib/admin/*.test.ts`) → **21/21 pass** (roles, site-context, modules, plans).
- Rien commité, rien poussé.

## 4. Ce qui reste (tranches suivantes)

1. **Backend multi-tenant** : migrations RLS effectives en base (`site_id`/`reseller_id` sur `user_roles`, policies par rôle, bucket `site-assets` à créer s'il n'existe pas) — le front est déjà tolérant (fallback rôle seul).
2. **Aperçu live « brouillon »** : l'iframe reflète la version enregistrée (rechargée au save) ; passer les valeurs non enregistrées au portail nécessiterait un canal `postMessage` ou un endpoint `?preview=` consommant un payload draft.
3. Pages existantes (dashboard, sessions, transactions, vouchers, users, logs, analytics, resellers, settings) à brancher explicitement sur le filtre `site_id` du contexte (le sélecteur filtre déjà par construction via les requêtes des nouvelles pages ; les anciennes pages restent à auditer une à une).
4. TanStack Table (tri/pagination serveur) seulement si les volumes l'exigent — documenté comme « plus tard ».
5. Impression/QR code du lien portail depuis la page Sites.

## 5. Fichiers modifiés / créés

Nouveaux :
- `docs/DECISION-ADMIN-FRAMEWORK.md`
- `docs/RAPPORT-ADMIN.md`
- `src/context/SiteContext.tsx`
- `src/components/admin/HelpTip.tsx`
- `src/pages/admin/AdminModules.tsx`
- `src/pages/admin/AdminPlans.tsx`
- `src/lib/admin/roles.ts`, `site-context.ts`, `modules.ts`, `plans.ts` (+ `.test.ts` associés)
- `src/hooks/usePortalConfig.ts` (nouveau hook du portail, retouché pour TS2589)

Modifiés :
- `src/App.tsx` (SiteProvider sur `/admin`, routes modules/plans)
- `src/hooks/useAdminAuth.ts` (memberships, rôle effectif, périmètres)
- `src/components/admin/AdminLayout.tsx` (sélecteur, drawer mobile, fil d'Ariane, nav filtrée par rôle)
- `src/pages/admin/AdminSites.tsx` (réécriture : édition complète + upload logo + color picker + aperçu)
- `src/lib/admin/site-context.ts` (interface `SiteLike` étendue aux champs du portail)
