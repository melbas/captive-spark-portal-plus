# DOCUMENT FINAL — Cahier de lancement Back office & Backend
### Portail Captif WiFi Spark — base de travail pour les deux agents

*Ce document fait la synthèse critique des trois audits (front, back office, backend), corrige leurs angles morts, pose le principe directeur « portail d'abord » et définit les missions des deux agents (back office / backend) avec critères d'acceptation.*

---

## 1. Ce que les analyses précédentes ont manqué (manquements)

1. **Le walled garden n'est nulle part** : aucun audit ne liste les domaines qui doivent être accessibles AVANT authentification (portail Vercel, `*.supabase.co`, passerelles de paiement). C'est LA configuration réseau qui décide si le portail s'affiche ou non sur un UDM Pro. Sans elle, le meilleur portail du monde reste une page blanche derrière la redirection captive.
2. **HTTP vs HTTPS du portail captif** : certains clients captive détectent mal le HTTPS avant authentification. Le portail doit être testé en conditions réelles de redirection (captive.apple.com, ncsi). Non traité.
3. **Zéro test automatisé, zéro CI** : ni tests unitaires, ni e2e, ni GitHub Action. On va refondre le back office sans filet. Le plan de travail des deux agents doit inclure une CI minimale (build + lint + tests critiques).
4. **Le sélecteur de site courant** : mentionné comme « trou » côté UX, mais c'est en réalité un problème d'ARCHITECTURE — tout le back office est global alors que la donnée est par site. Chaque page admin doit être scopée par `site_id`, avec un site courant en contexte (URL ou état global). À décider AVANT d'écrire les pages.
5. **`events` (670 lignes) est la table la plus peuplée et personne ne sait à quoi elle sert** : non documentée dans les audits, non lue par le front. À qualifier ou archiver.
6. **Le point d'entrée public** : la racine `/` et `/portal/demo` divergent (corrigé pour démo, mais la racine reste un portail « sans site » qui pollue la métrique et le référencement). Redirection `/` → portail du site par défaut à trancher.
7. **Le parcours « voucher » est orphelin** : AdminVouchers a un bug bloquant (profile_id hardcodé), les vouchers ne sont pas proposés dans le portail riche (seul le flux simplifié les a). Trois implémentations à unifier.
8. **Coût et fournisseur SMS au Sénégal** non arbitrés (Orange SMS API existe en self-service ; il existe aussi des agrégats locaux). Bloquant pour sortir du 123456.
9. **Absence de gestion d'erreur utilisateur** : le portail avalise les échecs (erreurs UniFi ignorées, toasts génériques). Pour un non-technique dans un salon, un échec d'autorisation doit être diagnosable depuis le back office (statut de session, dernière erreur).
10. **Performance mobile** : bundle 1,2 Mo (347 Ko gzip) sans code-splitting — le portail doit se charger vite sur le WiFi captif justement lent. Le portail captif est le pire endroit pour un gros bundle.

## 2. Incohérences entre les analyses (arbitrages)

| Sujet | Audit back office dit | Audit backend dit | Arbitrage |
|---|---|---|---|
| Tables de config | « à brancher » | « No access, illisibles même au client » | Raison : RLS. Solution = l'architecture §E du rapport backend (policies SELECT publiques sur les lignes actives), pas juste « brancher le front » |
| Données mockées | « à brancher » (famille, jeux) | « créer les tables OU retirer du bundle » | Décision : le portail riche ne présente que ce qui est branché ; le reste est masqué par `portal_enabled_modules` jusqu'à implémentation |
| Fidélité | « jeu de points sympa » | « triple écriture, fallback écrasant » | Un seul mécanisme : colonne `loyalty_pts` unique + RPC atomique ; `loyalty_points` supprimée |
| Sécurité vs rapidité démo | Priorité aux fonctionnalités | P0 sécurité avant tout | Les P0 sécurité concernent ce qui est exposé PUBLIQUEMENT (déjà en ligne sur Vercel) → ils partent en premier, sans bloquer le chantier back office |
| WhatsApp | (absent de l'audit) | (absent de l'audit) | Décision produit : retiré intégralement (fait, commit 62e816f) — WhatsApp = canal de relance marketing hors réseau, jamais whitelisté |

## 3. Points de convergence (les fondations sont bonnes)

1. La charte shadcn/Tailwind est **identique** entre admin et portail → le back office héritera naturellement du design.
2. Le modèle de données de personnalisation **existe déjà** (portal_config → customizations/modules/themes) avec seed de référence : pas de refonte DB, seulement des policies + un back office.
3. `sites` + `wifi_plans` sont déjà lus correctement par `Portal.tsx` : le modèle « tout par site » est validé par le code.
4. La chaîne technique UniFi est implémentée côté Edge (login + authorize-sta) : il faut la sécuriser et la brancher, pas la réécrire.
5. Le parcours riche fonctionne de bout en bout en mode démo : on part d'une base vivante, pas d'une maquette.

## 4. Principe directeur : « partir du portail » — VALIDÉ

L'intuition d'Abdoulaye est la bonne, et voici pourquoi techniquement :

> **Le portail existant devient la spécification fonctionnelle vivante du produit.** Chaque valeur codée en dur dans le portail (une couleur, un texte, un slide, une durée, un module activé, une méthode d'auth) est inventoriée, déplacée en base, et obtient son contrôle dans le back office. Le front ne change PAS de design — il change de source de vérité (la base au lieu du code).

Ce qu'il ne faut PAS faire : redessiner le back office en parallèle puis « connecter ». Ce qu'il faut faire : une **passation systématique** — les deux agents partent d'un inventaire unique de tout ce que le portail affiche/déclenche (l'« inventory » ci-dessous), et le back office est la salle de contrôle de cet inventaire.

**L'inventaire de référence (à produire en premier)** : chaque élément du portail riche = {id, où il est dans le code, table/colonne cible, page admin qui le pilote, type de contrôle (toggle/texte/couleur/upload)}. C'est le contrat entre les deux agents.

## 5. Missions des deux agents

### Agent BACKEND
1. **Inventaire front→DB** (avec l'agent back office) : le contrat ci-dessus.
2. **P0 sécurité** (ordre du rapport backend §D.1-6) : kill du bypass OTP sauf flag, HMAC fail-closed + idempotence webhook, JWT obligatoire sur les Edge Functions sensibles, restriction des policies anon larges, chiffrement pgcrypto du secret UniFi, rate limiting OTP.
3. **Versionnage du schéma** : `supabase db pull`, migrations commitées, tables mortes archivées (drop ou schéma `archive`), doublons de policies nettoyés.
4. **Ouverture des policies de lecture publique** sur les tables de config (lignes actives uniquement) + policy admin `is_admin_user()` en écriture + trigger `portal_version`.
5. **RPC atomiques** : `increment_statistic`, `increment_loyalty_pts`, remplacement des écritures front directes par des Edge Functions authentifiées.
6. **Schéma family** (si module famille activé) ou masquage du module.
7. **Module UniFi** : CRUD `hardware_integrations` (pgcrypto), test de connexion admin-only, profils de bande passante (`access_profiles`), doc walled garden (domaines à whitelister par forfait).

### Agent BACK OFFICE
1. **Même inventaire front→DB** (co-titulaire du contrat).
2. **Fondations admin** : sélecteur de site courant (contexte global), layout responsive (drawer), fil d'Ariane, aide contextuelle FR.
3. **Sites** : édition complète (logo, couleur, textes, activation, lien copiable, aperçu téléphone live via iframe).
4. **Modules du parcours** : grille de toggles par site (les 12 modules seedés) qui pilote réellement le portail.
5. **Forfaits** : CRUD complet par site, ordre, badge populaire.
6. **Contenus** : pubs (slides/vidéo/audio avec upload + prévisualisation), quiz/jeux/récompenses (CRUD simple), traductions FR/EN des contenus.
7. **Wizard site en 4 étapes** + modèle de forfaits prérempli.
8. **Exploitation** : actions sur users/sessions/vouchers, exports, recherche/filtres, suppression du bug profile_id des vouchers.

### Règles communes
- CI minimale : build + tsc + lint à chaque push ; tests e2e Playwright du parcours (existants dans /tmp/pwtest, à versionner dans le repo).
- Aucun déploiement client sans que la checklist P0 sécurité soit verte.
- Chaque page admin livrée = démontrable par un non-technique (aperçu + aide contextuelle).

## 6. Ordre de livraison proposé

1. Inventaire + P0 sécurité (backend) ∥ fondations admin (back office)
2. Portail branché sur la config (backend livre les policies, back office livre Sites+Modules)
3. Contenus + forfaits + UniFi
4. Wizard + exploitation + conformité

---

*Sources : AUDIT-BACKOFFICE.md, AUDIT-BACKEND.md, ANALYSE-CROISEE.md.*
