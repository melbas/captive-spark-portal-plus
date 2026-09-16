# AUDIT BACK-OFFICE — Portail Captif WiFi Spark (PremiumConnect / WIFI Sénégal)

*Audit statique du front admin (`src/pages/admin/`, `src/components/admin/AdminLayout.tsx`) et de ses liens avec le portail client. Aucun code modifié.*

---

## A) État actuel, page par page

Légende : **[Supabase]** = lit/écrit des données réelles · **[Mock]** = données codées en dur · **[Placeholder]** = écran décoratif.

### AdminLogin (`AdminLogin.tsx`) — [Supabase]
- Auth email/mot de passe via `supabase.auth.signInWithPassword`, contrôle du rôle admin sur la table `user_roles` (hook `useAdminAuth`).
- Redirection vers `/admin/dashboard` si déjà connecté, message d'erreur si compte sans droits.
- **Trous** : pas de récupération de mot de passe, pas de 2FA, pas de gestion des sessions/tentatives. Aucun lien « mot de passe oublié ».

### AdminLayout (`src/components/admin/AdminLayout.tsx`) — [Supabase]
- Sidebar fixe 280px avec 10 entrées (Dashboard, Revendeurs, Sites, Sessions, Transactions, Utilisateurs, Vouchers, Logs, Analytics, Paramètres), garde de route par rôle admin, déconnexion.
- **Trous** : aucune navigation mobile (sidebar non repliable, pas de hamburger), pas de fil d'Ariane, pas de sélecteur de site courant (tout est global), header purement décoratif (« Administration »), pas de badge de notification ni d'état de santé système.

### AdminDashboard — [Supabase]
- 4 cartes de KPI (sessions actives, utilisateurs WiFi, revenus FCFA cumulés, utilisateurs à risque de churn) rafraîchies toutes les 30 s, agrégées en direct depuis `wifi_sessions`, `wifi_users`, `transactions`.
- **Trous** : aucun graphe, aucune tendance (pas de delta vs hier), aucun lien cliquable vers les pages correspondantes, aucun filtre par site/période, pas de revenus des dernières 24 h.

### AdminSites — [Supabase, create-only]
- Liste les sites (table `sites`), création d'un site (nom, type hôtel/restaurant/campus/public/commerce/institution/autre, localisation) avec génération automatique du `portal_slug`.
- **Trous** : **pas d'édition, pas d'activation/désactivation, pas de suppression** ; pas de champs `logo_url`, `primary_color`, `welcome_msg`, `whatsapp_support` (que `Portal.tsx` lit pourtant bien dans `sites` !) ; pas d'URL d'aperçu du portail (`/portal/<slug>`) à copier ; pas de gestion des forfaits par site ; pas de pagination ni de recherche.

### AdminResellers — [Supabase, create-only]
- Liste + création de revendeurs (`resellers` : nom, email, téléphone, commission %).
- **Trous** : pas d'édition/désactivation, aucune vue des transactions/vouchers rattachés au revendeur, pas de calcul de commissions dus, pas de connexion revendeur (rôle dédié).

### AdminSessions — [Supabase, read-only]
- 100 dernières sessions `wifi_sessions` (MAC, SSID, début, expiration, statut), rafraîchies 30 s.
- **Trous** : aucune action (déconnecter un client, prolonger, bloquer), pas de filtre statut/site/recherche MAC, pas de pagination, pas de détail session.

### AdminUsers — [Supabase, read-only]
- 200 derniers `wifi_users` : identifiant, niveau de fidélité (LOYALTY_CONFIG), segment IA, jauge de churn risk, points, statut bloqué.
- **Trous** : **aucune action** (bloquer/débloquer impossible malgré l'affichage du badge « Bloqué »), pas de fiche utilisateur détaillée, pas de recherche/filtre, pas d'export, colonne segment IA non expliquée pour un non-technique.

### AdminVouchers — [Supabase, create-only, partiellement buggé]
- Liste 200 vouchers + génération de lots (max 100, codes 8 caractères).
- **Trous** : `profile_id` codé en dur à `00000000-…` (probablement rejeté par la FK — génération vouée à l'échec en production), pas de choix du forfait/durée du voucher, pas d'export/impression PDF des codes, pas de révoquer, pas de liaison à un site/revendeur, incohérence de colonnes `expires_at`/`valid_to` gérée « au cas où ».

### AdminTransactions — [Supabase, read-only]
- 200 dernières `transactions` : montant, méthode, statut, commission, date relative.
- **Trous** : pas de totaux, pas de filtre statut/méthode/période, pas de export comptable, pas de détail (qui, quel forfait, quel site), pas de remboursement.

### AdminLogs — [Supabase, read-only]
- 200 derniers `pc_audit_logs` (action, entité, IP, date).
- **Trous** : pas de filtre, pas de recherche, pas de détail du payload, aucune action n'écrit visiblement dans ces logs depuis le back office (boucle d'audit à moitié vide).

### AdminAnalytics — [Supabase, agrégations client]
- Recharts : MRR mensuel (area), connexions 7 jours (line), répartition méthodes de paiement (pie), segments IA (bar), KPI ARPU / churn rate / revenus — tout calculé **côté navigateur** à partir des tables brutes.
- **Trous** : pas de sélecteur de période ni de site, pas de funnel d'authentification/paiement, pas de stats publicitaires (impressions/clics ne sont que des `console.log` côté portail), formules ARPU/churn fragiles (limites implicites, données tronquées), pas d'export.

### AdminSettings — [Placeholder]
- Une carte « Configuration globale — Paramètres en cours de développement… ». **Rien n'est configurable depuis l'admin.**

### Pages admin « fantômes » dans `src/components/wifi-portal/`
`AdminDashboard.tsx` (445 l.), `AdminThemeManager.tsx`, `ThemeMarketplace.tsx`, `ThemePackageManager.tsx`, `ThemeVersionManager.tsx`, `ThemeImporter/Downloader` : **aucun accès Supabase** (0 requête), état local/`localStorage` et données en dur. C'est une seconde « admin » interne au portail riche, hors routage `/admin`, invisible pour l'exploitant, non persistée. À considérer comme du code mort ou à fusionner.

---

## B) Écarts front (portail client) → back office : ce qui est personnalisable en théorie mais pas pilotable

### Portail simplifié `/portal/:slug` (`Portal.tsx` + `src/components/portal/`)
| Élément | Lu depuis Supabase ? | Pilotable depuis l'admin ? |
|---|---|---|
| Nom du site, slug | ✅ `sites` | ✅ mais à la création seulement, non modifiable ensuite |
| Logo, couleur primaire, message d'accueil, WhatsApp support | ✅ `sites.logo_url / primary_color / welcome_msg / whatsapp_support` | ❌ **champs éditables nulle part** |
| Forfaits (nom, durée, prix, débit, data, appareils, populaire, ordre) | ✅ `wifi_plans` | ❌ **aucune page de gestion des forfaits** |
| Activation/désactivation du site | ✅ `sites.is_active` | ❌ non togglable |
| Méthodes d'auth (SMS/email/voucher) — `PortalAuth.tsx` écrit dans `wifi_users`/`sms` | ❌ imposé en dur | ❌ pas d'option « quels canaux activer » |
| Paiement — `PortalPayment.tsx` | en partie (transactions) | ❌ méthodes de paiement non configurables |
| Textes/étapes du flux welcome→auth→plans→payment | ❌ en dur (i18n) | ❌ |

### Portail riche `/` (`WifiPortalContainer` + `src/components/ads/`)
| Élément | État |
|---|---|
| Slides pub (4 images, titres FR/EN, liens) | **codés en dur** dans `WifiPortalContainer.tsx` (table `ad_videos` typée dans Supabase mais jamais lue) |
| Vidéo pub (URL, titre, poster) | **codée en dur** (sample-videos.com) — table `ad_videos` non lue |
| Audio promo (URL, titre, cover) | **codé en dur** (SoundHelix) |
| Numéro WhatsApp support | **en dur** `221771234567` dans le composant |
| Impressions/clics pub | seulement `console.log` — aucune remontée |
| Jeux mini-games (types, récompenses points/minutes) | en dur dans `MiniGamesHub` / `types` — table `games` jamais lue |
| Quiz | en dur — tables `quizzes`/`quiz_questions`/`quiz_options` jamais lues |
| Récompenses (catalogue, coûts) | en dur dans `RewardSystem` — table `rewards` jamais lue |
| Parrainage | simulé (state local, bonus fictifs) — table `referrals` jamais lue |
| Gestion famille | **données mock** (`mock-family-members.ts`), service familial partiellement branché |
| Durée de session (30 min), points de départ, type d'engagement (aléatoire vidéo/quiz) | en dur dans `useWifiPortal.ts` — le commentaire du code dit explicitement « could be configured by the admin » |
| Thèmes (Marketplace, AdminThemeManager…) | state local / localStorage, aucune persistance — tables `portal_themes`, `portal_modules`, `portal_enabled_modules`, `portal_config`, `portal_customizations` jamais lues |
| Textes CGU / confidentialité | liens `#` |

### Synthèse des tables Supabase
- **Lues par le front** : `sites`, `wifi_plans` (par `Portal.tsx` uniquement), `wifi_users`, `wifi_sessions`, `transactions`, `vouchers`, `resellers`, `portal_statistics`, `pc_audit_logs`, `user_roles`, tables `family_*`.
- **Jamais lues malgré des types générés** (`src/integrations/supabase/types.ts`) : `portal_config`, `portal_customizations`, `portal_modules`, `portal_enabled_modules`, `portal_themes`, `ad_videos`, `games`, `quizzes`(+questions/options), `rewards`, `referrals`, `portal_analytics`, `portal_customer_journeys`, `user_segments`, `auth_otp_config`, `payment_methods`, `access_profiles`…
- **Le schéma de personnalisation existe en base mais rien n'y accède ni côté portail ni côté admin.** C'est le maillon manquant n°1 : la couche « pilote » du portail est écrite mais jamais branchée.

---

## C) Propositions d'amélioration UX/design, priorisées

### P0 — Bloquant (sans ça, le back office n'est pas exploitable)
1. **Brancher la personnalisation** : faire lire `portal_customizations`/`portal_config` par `WifiPortalContainer` et `/portal/:slug`, et créer les pages admin correspondantes (éditeur de design + gestionnaire de pubs). Aujourd'hui le produit « monétisable » (pubs, thèmes) n'existe que dans le code.
2. **Page Sites enrichie** : édition complète d'un site (logo, couleur, message d'accueil, WhatsApp), toggle actif/inactif, lien copiable `/portal/<slug>?demo`, aperçu intégré (iframe/preview), et onglet « Forfaits » par site (CRUD `wifi_plans` avec drag-and-drop d'ordre, badge « populaire »).
3. **Corriger la génération de vouchers** (`profile_id` en dur) et ajouter : choix du profil/durée, export CSV/PDF imprimable, révocation.
4. **Actions sur les données** : bloquer/débloquer un utilisateur, terminer une session, filtrer + rechercher + paginer toutes les tables. Toute page à lire seul n'est pas un outil d'exploitation.

### P1 — Important
5. **Page « Modules du parcours »** : grille de toggles alimentée par `portal_modules`/`portal_enabled_modules` (slides pub, vidéo, audio, quiz, jeux, récompenses, parrainage, famille, paiement) avec activation par site — c'est la promesse « activer/désactiver chaque module sans code ».
6. **Gestionnaire de contenus pubs** : CRUD de slides (upload image, titres FR/EN, lien, planification, poids), vidéos et audios (`ad_videos`), avec prévisualisation du carrousel.
7. **Éditeur quiz/jeux/récompenses** : CRUD `quizzes`, `games`, `rewards` avec formulaires simples (question + options + bonne réponse ; coût en points / gain en minutes).
8. **Filtres globaux et cohérence** : sélecteur de site + période dans le header, répercuté sur dashboard/analytics ; totaux et exports CSV sur transactions/utilisateurs ; moments de tendance (Δ vs période précédente).
9. **Responsive admin** : sidebar repliable en drawer mobile, tableaux avec défilement horizontal et vue cartes sur petit écran.

### P2 — Confort
10. **Aide contextuelle** en français simple sur chaque écran (info-bulles « à quoi ça sert »), glossaire (MAC, churn, ARPU, voucher).
11. **Gestion des rôles** (admin / revendeur / staff site) avec périmètre par site, et page de réglages réelle (remplace le placeholder).
12. **Journalisation montante** : écrire dans `pc_audit_logs` à chaque action admin (aujourd'hui la table existe mais rien ne l'alimente visiblement).
13. **i18n de l'admin** : l'admin est déjà en français, mais le portail a un `LanguageContext` FR/EN — mutualiser et permettre le choix de la langue admin.
14. **Supprimer/fusionner** la deuxième admin interne (`components/wifi-portal/Admin*`, ThemeMarketplace…) : redondante, non persistée, source de confusion.

### Cohérence visuelle
Le back office utilise bien shadcn/ui + Tailwind + les tokens de marque (`--brand-gradient`, `rounded-2xl`, `shadow-card`), donc la même charte que le portail — bon point. Faiblesses : tableaux denses sans mode liste/carte, contrastes des badges secondaires à vérifier, aucun état vide illustré, aucun feedback de chargement squelette, et zéro accompagnement utilisateur (onboarding, tours guidés).

---

## D) Maquettes fonctionnelles (wireframes texte) du back office idéal « non-tech friendly »

### D.1 Gabarit général
```
┌────────────────────────────────────────────────────────────────┐
│ [Logo PC] PremiumConnect   [Site : Tous ▾] [Période : 30j ▾]   │
│                                          [🔔] [fr▾] [Avatar ▾] │
├──────────────┬─────────────────────────────────────────────────┤
│ SIDEBAR      │  Fil d'Ariane : Accueil / Sites / Hôtel Terrou  │
│ 🏠 Accueil   │  ┌───────────────────────────────────────────┐  │
│ 🗺️ Sites     │  │  Contenu de la page                       │  │
│ 🎨 Design    │  │  (bouton « Aide » flottant en bas à       │
│ 📺 Publicités│  │   droite sur chaque page)                 │  │
│ 🧩 Modules   │  └───────────────────────────────────────────┘  │
│ 💰 Forfaits  │                                                 │
│ 🎟️ Vouchers  │                                                 │
│ 👥 Clients   │                                                 │
│ 📶 Sessions  │                                                 │
│ 💳 Paiements │                                                 │
│ 📈 Analyses  │                                                 │
│ 🤝 Revendeurs│                                                 │
│ ⚙️ Réglages  │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
(sidebar → drawer coulissant < 1024px ; bouton « ? » = aide en français simple)
```

### D.2 Accueil « Assistant » (dashboard orienté tâches)
```
Bonjour 👋 — Voici l'état de votre réseau aujourd'hui.
[4 grandes cartes : Clients connectés · Revenus du jour · Sites actifs · Alertes]
[Graphique simple : connexions des 7 derniers jours — 1 seule courbe, libellés FR]

Que voulez-vous faire ?
┌─────────────────────┐ ┌─────────────────────┐ ┌───────────────────┐
│ ➕ Créer un site    │ │ 📺 Changer les pubs │ │ 💰 Modifier un    │
│    de WiFi          │ │    du portail       │ │    forfait        │
└─────────────────────┘ └─────────────────────┘ └───────────────────┘
```

### D.3 Wizard « Créer un site » (4 étapes, une question par écran)
```
Étape 1/4 — Le lieu        : Nom ? [____]  Type ? [Hôtel ▾]  Ville ? [____]
Étape 2/4 — L'identité     : Logo [Télécharger 📁]  Couleur [🎨 #5B4DFF]
                             Message de bienvenue [Bienvenue !____]
Étape 3/4 — Le support     : WhatsApp d'assistance [+221 ____]
Étape 4/4 — Les forfaits   : modèles proposés (Café / Hôtel / Campus)
                             [Choisir un modèle ▾] puis éditer prix/durées
   Aperçu à droite en permanence : 📱 maquette du portail mise à jour en direct
   [← Retour] [Enregistrer]  →  « Votre portail est prêt :
    https://…/portal/hotel-terrou  [Copier le lien] [Voir l'aperçu] »
```

### D.4 Éditeur de design (« Design »)
```
[Aperçu téléphone 📱]        [Panneau d'édition]
  rendu live du portail       Onglets : Couleurs | Logo | Textes | Thème
  (welcome → plans →          Couleur principale [🎨]  Arrière-plan [🎨]
   paiement) cliquable        Police [Moderne ▾]  Thème [Voyage ▾ Sombre ▾]
                              Textes : bouton « Se connecter » [___]
                              WhatsApp visible ? (o) Oui ( ) Non
                              [Enregistrer] [Annuler] — tout en WYSIWYG,
                              aucun champ technique (pas de CSS, pas d'URL)
```

### D.5 Gestionnaire de publicités
```
Onglets : [Slides image] [Vidéos] [Audios]
Slides : liste réordonnable (↑↓ ou glisser-déposer)
  ┌ [miniature] Titre FR [___] EN [___] Lien [___] Actif [toggle] ✏️ 🗑 ┐
  [+ Ajouter une slide]  → upload image + 2 champs texte, c'est tout
Vidéos/Audios : upload fichier + titre + poster ; durée max indiquée
Planification : [Du 01/03 au 15/03] [Toujours afficher en 1re position ☐]
Aperçu du carrousel en bas de page, rafraîchi en direct.
```

### D.6 Modules du parcours
```
Sur quel site ? [Hôtel Terrou ▾]
Parcours du visiteur, de gauche à droite :
 [Arrivée] → [Publicités] → [Authentification] → [Quiz/Jeux] → [Forfaits]
 → [Paiement] → [Accès WiFi]
Chaque bloc = carte avec [toggle ON/OFF], une description d'une ligne et « Réglages ▸ »
  • Authentification : SMS ☑  Email ☑  Voucher ☐  — « Comment les clients
    prouvent leur identité »
  • Jeux : « Gagner des minutes en jouant » — Réglages : récompense [15 min]
  • Paiement : Orange Money ☑ Wave ☑ Carte ☐
Prévisualisation : « Voir le parcours comme un client » (mode démo).
```

### D.7 Forfaits
```
[Hôtel Terrou ▾]                    [+ Nouveau forfait]
┌ Drag │ Nom       │ Durée │ Prix    │ Débit │ Populaire │ Actif │ ✏️ ┐
│  ≡   │ Escale 1h │ 60 mn │ 500 F   │ 5 Mb  │    ★      │  ON   │    │
│  ≡   │ Journée   │ 24 h  │ 2 000 F │ 10 Mb │           │  ON   │    │
└ Formulaire = 6 champs max, grands boutons, prix affichés en FCFA ┘
```

### D.8 Clients / Sessions / Paiements (toutes les pages data)
```
Barre du haut : [🔍 Rechercher…] [Filtre statut ▾] [Filtre site ▾] [Export CSV]
Ligne → clic → panneau latéral (drawer) avec détail + ACTIONS contextuelles :
  Client : [Bloquer/Débloquer] [Voir ses sessions] [Offrir un voucher]
  Session : [Déconnecter] [Prolonger 30 mn]
  Paiement : [Marquer remboursé] [Télécharger le reçu]
Pagination « Charger plus », jamais de tableau brut sans action.
```

### D.9 Vouchers (corrigé)
```
[+ Générer] → assistant : Quel forfait ? [▾]  Combien ? [10]  Nom du lot [___]
  Validité [90 jours ▾]  [Générer]
Résultat : écran d'impression 🖨️ (PDF, gros codes, n° de lot) + [Export CSV]
Liste : recherche par code, filtre Disponible/Utilisé/Expiré, [Révoquer].
```

---

## Conclusion
Le socle technique est sain (auth admin par rôle, Supabase réel sur toutes les pages d'observation, charte cohérente avec le portail), mais le back office est aujourd'hui un **outil de consultation** (10 pages dont 1 placeholder, 2 de création simple, 0 édition) alors que le portail client est un produit riche entièrement **piloté par le code**. La priorité absolue est de brancher les tables de configuration déjà modélisées (`portal_config/customizations/modules/themes`, `ad_videos`, `games`, `quizzes`, `rewards`) entre un back office éditable et le front du portail — le schéma existe, les requêtes n'existent pas.
