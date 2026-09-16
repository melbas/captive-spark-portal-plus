# ANALYSE CROISÉE — Portail (front) × Back office × Backend

*Février 2026 — croise AUDIT-BACKOFFICE.md et AUDIT-BACKEND.md. Décisions produit incluses : retrait WhatsApp, intégration UniFi (réseau/routage).*

---

## 1. La contradiction centrale du produit

Le produit se vend sur **l'effet waouh du parcours client** (jeux, quiz, pubs, récompenses) mais :

| Réalité front | Réalité backend | Réalité back office |
|---|---|---|
| Parcours riche 100 % codé en dur (slides, vidéo sample-videos.com, audio SoundHelix, WhatsApp, 30 min, points aléatoires) | Tables de personnalisation existantes (portal_config, portal_customizations, portal_enabled_modules, portal_themes, ad_videos, games, quizzes, rewards) — **0 ligne de front ne les lit** | Aucune page n'édite quoi que ce soit (Settings = placeholder vide) |

**Conséquence** : l'effet waouh est une démo figée, pas un produit. Chaque nouveau client exige aujourd'hui une modification de code. La valeur perçue par Abdoulaye (« c'est ça qui impressionne ») repose sur les parties les moins solides du système.

**Décision structurante n°1** : le contrat du produit devient *« tout ce qui est visible sur le portail est une ligne en base, pilotable du back office »*. Chaque élément codé en dur restant est une dette à traquer.

## 2. Contradictions détectées (analyse croisée)

1. **Deux back offices fantômes** : `src/pages/admin/` (routé, Supabase réel) vs `src/components/wifi-portal/AdminDashboard + AdminThemeManager + ThemeMarketplace` (0 requête, localStorage, jamais routés). Le portail riche ne lit AUCUN des deux. Il faut fusionner : le second contient l'UX d'édition de thèmes la plus aboutie du repo — à récupérer dans le vrai admin, pas à jeter.
2. **Deux portails clients** : `/` (riche, hardcodé) et `/portal/:slug` (piloté par `sites`/`wifi_plans`, mais design simplifié). Le slug `demo` pointe vers le riche. → **Une seule architecture cible** : le portail riche devient le moteur de `/portal/:slug`, la racine `/` disparaît (ou redirige). Fin de la dualité.
3. **Fidélité en double écriture** : colonnes `loyalty_points` ET `loyalty_pts`, + RPC `increment_loyalty_points` en `.catch()` dont le fallback **écrase** les points à 10 au lieu d'incrémenter. Trois implémentations pour une seule fonctionnalité, aucune correcte.
4. **Famille sans base** : front expose des services famille complets alimentés par `mock-family-members.ts` ; aucune table `family_*` n'existe. Écran démo au portail = mensonge au client final.
5. **Paiement en deux logiques incompatibles** : le flux simplifié fait payer avant d'authoriser (Wave/OM), le portail riche fait « regarder une pub → accès gratuit ». Le modèle économique réel (Abdoulaye vend des forfaits) impose : accès gratuit par engagement = **option config du site**, pas un deuxième parcours parallèle. C'est exactement le rôle de `portal_modules`.
6. **OTP : trois vérités** : le back stocke dans `pc_audit_logs` (détournement), le front garde un bypass 123456 local, `send-otp` renvoie le code en HTTP par défaut. Aucune de ces trois logiques ne survivra à la prod.
7. **29 tables vides mais le front en présente les fonctionnalités** (vouchers, rewards, radius, chat IA, KPI financiers). Risque démo-client : cliquer sur une fonctionnalité et découvrir qu'elle ne fait rien. Il faut soit les brancher, soit les masquer — la grille `portal_enabled_modules` tranche.
8. **UniFi : le backend existe, le réseau manque** : `hardware_integrations` est vide, le flux n'a jamais tourné, mot de passe contrôleur en clair, `test-hardware-connection` exposé publiquement. Paradoxe : la seule partie vraiment différenciante (autorisation automatique après paiement) est la moins testée.

## 3. Logiques réseau — le volet UniFi (décision : retirer WhatsApp, intégrer UniFi)

**Retrait WhatsApp — raisonnement validé et appliqué (62e816f)** :
WhatsApp dans la whitelist du réseau invité = les visiteurs chattent mais n'achètent jamais (pas de tunnel de paiement exploitable sans accès Internet complet). WhatsApp devient **une cible de conversion, pas un service offert** : le portail collecte le numéro (OTP SMS), l'établissement peut ensuite relancer par WhatsApp Business — le contact est en base, à nous de l'exploiter hors réseau.

Supprimé : composant `WhatsAppSupport` (bouton flottant sur tout le portail), champ `sites.whatsapp_support` (DB), traductions, types. Le « support » du portail devient un canal à définir (email, formulaire, ligne dédiée) — décision produit à prendre en Phase 2.

**Intégration UniFi — ce que « routage » implique côté produit** :
- `hardware_integrations` devient une ressource de première classe : CRUD back office (contrôleur, site UniFi, identifiants chiffrés pgcrypto), test de connexion réservé admin
- Chaîne de vérité du routage : OTP/paiement validé (Edge) → `authorize-sta` (durée du forfait) → `wifi_sessions` = source de vérité → **CoA (Change of Authorization) et re-vocation** via `radius_coa_requests`/`revoke-session` à l'expiration
- Bande passante par forfait (`speed_down_mb` déjà en base) : appliquée côté UniFi (user group / bandwidth limit par profil d'accès, table `access_profiles` déjà seedée)
- Le routage/whitelist du portail captive (moyens de paiement, SMS) doit être défini par forfait : un « essai gratuit » peut n'ouvrir que le portail + paiement

## 4. Avantages / game changers identifiés

1. **Le portail lit déjà `sites` + `wifi_plans` proprement** (Portal.tsx) — le modèle de personnalisation par site fonctionne, il ne manque que l'admin pour l'éditer et l'étendre au portail riche.
2. **`portal_modules` est déjà seedée (12 modules) avec CHECK mandatory/optional/premium** — la grille de toggles du back office a son référentiel prêt.
3. **`pc_admin_users` + `user_roles`** existent : double modèle admin (Supabase auth + rôle) déjà en place, à unifier.
4. **L'architecture « vue publique / écriture admin »** du rapport backend (§E) est directement implémentable : policies SELECT anon sur les tables de config actives, policies ALL admin via `is_admin_user()`, portail en lecture seule. C'est le plan de la Phase 1.
5. **Effet waouh défendable en démo terrain** : le parcours engagement → accès → extension → jeux tourne déjà de bout en bout ; une fois branché sur la config, la démo devient démo du vrai produit.

## 5. Scope consolidé révisé (intégrant WhatsApp + UniFi)

- **Phase 0 — Sécurisation** (inchangée, prioritaires 1-6 du rapport backend) + retrait des policies anon larges dès le nouveau flux OTP/Edge en place.
- **Phase 1 — Socle personnalisation** : portail riche branché sur `portal_config`/`portal_customizations`/`portal_enabled_modules` ; admin Sites complet (sans champ WhatsApp) ; CRUD forfaits ; grille de modules ; fusion des deux admins ; suppression de la racine `/` au profit de `/portal/:slug`.
- **Phase 2 — Contenus + réseau** : gestionnaire de pubs (ad_videos) ; éditeur quiz/jeux/réwards ; wizard site ; **module UniFi** dans le back office (intégration chiffrée, test, profils de bande passante) ; canal support à définir (remplaçant WhatsApp).
- **Phase 3 — Exploitation** : actions data (bloquer, déconnecter, exporter), responsive, aide contextuelle, fidélité unifiée, conformité (consentement, rétention MAC).

*Fin — documents sources : AUDIT-BACKOFFICE.md, AUDIT-BACKEND.md.*
