# DÉCISION — Framework back office (build vs reuse)

*Étude demandée avant tout codage. Comparaison des trois options, décision motivée.*

## Options comparées

| Critère | (a) Garder shadcn actuel + TanStack Query/Table + react-hook-form | (b) Refine headless + data provider Supabase | (c) Template satnaing/shadcn-admin |
|---|---|---|---|
| Cohérence design shadcn (principe validé : mêmes tokens que le portail) | ✅ totale — le code actuel utilise déjà les tokens (var(--brand-gradient), rounded-2xl, shadow-card) | ⚠️ headless OK mais impose ses conventions de pages/resources ; adaptation du design existant | ⚠️ design différent (il a son propre layout, ses propres tokens) → refonte visuelle |
| Effort immédiat | ✅ faible : 11 pages existent, on les enrichit | ❌ réécriture des 11 pages + provider | ❌ rebase des 11 pages dans un autre layout |
| Maintien | ✅ deps déjà présentes (@tanstack/react-query, hookform, resolvers) | ➖ +1 dépendance lourde, versionnée vite | ❌ template à suivre en amont (fork drift) |
| Courbe non-tech (c'est l'UI qui compte, pas le framework) | ✅ neutre — l'UX se joue dans nos composants (aide, aperçu, toggles) | ➖ abstractions abstraites pour le dev, pas d'effet utilisateur | ➖ idem |
| Multi-tenant (site courant, rôles) | ✅ contexte React simple + hook, sous notre contrôle | ➖ leur ownernship/resource model se marie mal avec « site courant global » | ➖ à reconstruire |

## Décision : option (a)

**Garder le socle shadcn/Tailwind + TanStack Query existant, sans migration.**

Justification :
1. Le principe validé est « le back office garde le design du portail ». Les deux options de réutilisation (b, c) cassent ou compliquent ce principe pour un gain qui est invisible côté utilisateur.
2. Les trous du back office (édition sites, toggles modules, CRUD forfaits) sont des trous de **pages et de données**, pas de framework. TanStack Query couvre déjà le cache/invalidate ; react-hook-form est installé.
3. Le multi-tenant (site courant + 4 rôles) est un modèle mental spécifique (sélecteur global qui filtre TOUTES les pages) qu'aucun des deux frameworks ne fournit : de toute façon à construire à la main, donc autant le construire dans notre socle.
4. Refine en headless aurait un coût de migration non trivial pour les 11 pages existantes, sans bénéfice mesurable pour un usage « opérateur non technique ».

Ce qu'on ajoute quand même (dans le socle, sans nouvelle dépendance majeure) :
- `SiteContext` global (src/context/SiteContext.tsx) : site courant persisté (localStorage), verrouillé pour `site_manager`.
- Rôles intégrés à `useAdminAuth` + filtrage du menu.
- AdminLayout responsive (drawer mobile), fil d'Ariane, composant d'aide contextuelle `HelpTip`.
- Tableaux : shadcn Table existant suffit aux volumes actuels (200 lignes max) ; TanStack Table ne sera ajouté que si tri/pagination serveur devient nécessaire (documenté dans RAPPORT-ADMIN.md comme « plus tard »).

## Ce que l'option (a) impose en échange (accepté)

- Chaque page fait son filtre `site_id` explicitement (pas de magie) — c'est visible et vérifiable, un plus pour la relecture.
- Pas de CRUD générés : les formulaires s'écrivent à la main. Acceptable : 3 formulaires dans cette tranche.
