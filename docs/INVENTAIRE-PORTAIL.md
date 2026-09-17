# INVENTAIRE PORTAIL → DB — Contrat front ⇄ back office ⇄ backend

*Agent portail — septembre 2026. Contrat de référence (PLAN-FINAL §4) : tout élément affiché par le portail riche est une ligne en base, pilotable du back office. Format : {élément, fichier:ligne, valeur actuelle, table/colonne cible, page admin, type de contrôle}.*

**Source de vérité front : `src/hooks/usePortalConfig.ts`** (chargé par slug : `sites` + `portal_config` + `portal_customizations` + `portal_enabled_modules` + `portal_modules` + `ad_videos`). Valeurs par défaut visuelles = `src/lib/portal-config-defaults.ts`, autorisées UNIQUEMENT en démo isolée (`/portal/demo`, `?demo=1`, racine `/`). Sur un vrai site : config publiée requise, sinon erreur affichée (fail-closed).

---

## 1. Publicités

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| Slide pub 1 | `WifiPortalContainer.tsx:68-72` (lecture) ; défaut `portal-config-defaults.ts:29-39` | « Accès WiFi Haut Débit » + image `/lovable-uploads/188625b4…png` | `ad_videos` (ligne `active`, `video_url`=image, `title`, `priority=1`) | Contenus → Pubs (à créer, Phase 2) | upload image + textes FR/EN + ordre |
| Slide pub 2 | idem ; défaut `:41-51` | « WiFi pour Entreprises » | `ad_videos` `priority=2` | Pubs | idem |
| Slide pub 3 | idem ; défaut `:53-63` | « Solutions WiFi Domicile » | `ad_videos` `priority=3` | Pubs | idem |
| Slide pub 4 | idem ; défaut `:65-75` | « Accès WiFi Mobile » | `ad_videos` `priority=4` | Pubs | idem |
| Rotation slides (7 s) | `WifiPortalContainer.tsx:142-143` | `interval=7000`, `autoRotate=true` | `portal_config` (colonne à ajouter `ad_rotation_seconds`, défaut 7) | Pubs | nombre |
| Vidéo pub | `WifiPortalContainer.tsx:179-194` ; défaut `portal-config-defaults.ts:79-92` | sample-videos.com big_buck_bunny | `ad_videos` (`video_url` .mp4 → rendu `VideoAd`) | Pubs | upload vidéo + poster |
| Audio pub | `WifiPortalContainer.tsx:196-208` ; défaut `:95-105` | SoundHelix-Song-1.mp3 | `ad_videos` (`video_url` .mp3 → rendu `AudioPromo`) | Pubs | upload audio + cover |

⚠️ `ad_videos` n'a pas de colonne `type` : le front déduit vidéo/audio de l'extension de l'URL (`usePortalConfig.ts:144-146 inferMediaKind`). **Backend à ajouter : `ad_videos.type` (enum image/video/audio)** — sinon fragile.

## 2. Textes & marque

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| Nom du portail | `WifiPortalContainer.tsx:111` | `portal.portalName` (config) sinon `t("portal")` | `portal_config.portal_name` (fallback `sites.name`) | AdminSites | texte |
| Accueil FR | `WifiPortalContainer.tsx:116-119` | `welcomeMessage.fr` sinon `t("connectToWifi")` | `portal_customizations.customization_data.message_fr` (`customization_type='welcome'`) ; fallback `portal_config.welcome_message` | AdminSites | texte FR |
| Accueil EN | idem | `welcomeMessage.en` | idem `.message_en` | AdminSites | texte EN |
| Logo | exposé `usePortalConfig.ts:261-262`, **pas encore appliqué au rendu** (dette, voir rapport) | — | `portal_config.logo_url` / `sites.logo_url` | AdminSites | upload image |
| Contact support | `WifiPortalContainer.tsx:76,130-134` | `supportContact` sinon masqué | `portal_customizations.customization_data.support` (`customization_type='contact'`) | AdminSites | texte (email/ligne dédiée). **WhatsApp banni — ne jamais réintroduire** |
| Conditions/CGU/CGV | `WifiPortalContainer.tsx:212-219` | liens `href="#"` (placeholders) | colonnes à créer `portal_config.terms_url/privacy_url` | AdminSites | URL |

## 3. Thème & couleurs

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| Couleur primaire | lue `usePortalConfig.ts:261-262` (`themeColor`), **non appliquée au CSS** (dette) | thème Tailwind global (`--primary`) | `portal_config.theme_color` (fallback `sites.primary_color`) | AdminSites ou AdminThemeManager | color picker |
| Thèmes | `ThemeMarketplace.tsx` etc. (non routés, non affichés) | localStorage, fantômes | `portal_themes` (seedée) | fusion admin (Phase 2) | palette |

## 4. Parcours & durées

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| Durée session | `WifiPortalContainer.tsx:52` → `useWifiPortal.ts:26,99,201` | 30 min (défaut démo) | `portal_customizations.customization_data.session_minutes` (`customization_type='journey'`) | AdminModules ou Sites | nombre |
| Points de départ | `WifiPortalContainer.tsx:53` → `useWifiPortal.ts:27,117` | 10 points (défaut démo) | idem `.starting_points` | idem | nombre |
| Type d'engagement | `WifiPortalContainer.tsx:54` → `useWifiPortal.ts:28,129-134` | `quiz` (défaut démo ; anciennement Math.random) | idem `.engagement_type` (enum video/quiz/random) | idem | select |
| Durée d'accès par forfait | `PaymentPortal.tsx` / `wifi_plans` | forfaits lus par le portail simplifié | `wifi_plans.duration_minutes` | AdminPlans | nombre |

## 5. Méthodes d'authentification

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| SMS/OTP (principal) | `sms-service.ts:113` (bypass `123456`) ; `user-service.ts:15-46` (flag `VITE_USE_EDGE_AUTH` → Edge `verify-otp`) | OTP démo 123456 volontairement maintenu jusqu'à la prod (skill captive-portal-dev) | Edge `send-otp`/`verify-otp` ; `wifi_users.auth_method='sms'`, `wifi_users.phone` | Activation = `portal_enabled_modules` ; fournisseur SMS = config backend | toggle + fournisseur |
| Email | accepté en saisie (`user-service.ts:22-30`), pas de vérification Edge email | champ optionnel | `wifi_users.email` | — | texte (pas de module) |
| Voucher | **absent du portail riche** (orphelin, ANALYSE-CROISEE §2.7) | — | `vouchers` + `wifi_users.auth_method='voucher'` | AdminVouchers (bug profile_id côté admin) | toggle module + codes |
| Méthode active par site | `WifiPortalContent.tsx:66-68` (`modules[key]`) | gating fail-closed | `portal_enabled_modules.is_enabled` (`portal_modules.module_name`) | AdminModules | toggle |

## 6. Paiements

| Élément | Fichier:ligne | Valeur actuelle | Table/colonne cible | Page admin | Contrôle |
|---|---|---|---|---|---|
| Logo Orange Money | `PaymentPortal.tsx:103` (`/logos/orange-money.svg`) | statique | `portal_config` ou assets + `portal_enabled_modules.module_name='payment'` | AdminModules (activation) + Phase 2 (réglages passerelle) | toggle |
| Logo Wave | `PaymentPortal.tsx:112` (`/logos/wave.png`) | statique | idem | idem | toggle |
| Bandeau démo paiement | `PaymentPortal.tsx:120` | « aucun paiement réel n'est débité » | — (texte de conformité) | — | — |
| Paiement réel Wave/OM | **non branché** : « paiement réel (Wave/Orange Money via Edge Functions) n'est pas encore activé » | — | Edge à créer (webhook HMAC, idempotence — AUDIT-BACKEND) | backend | — |
| Forfaits affichés | lus via `wifi_plans` (portail simplifié) | — | `wifi_plans` (par `site_id`, ordre, badge populaire) | AdminPlans | CRUD |

## 7. Modules du parcours (gating)

Jointure `portal_enabled_modules` ↔ `portal_modules` (catalogue seedé, 12 modules) faite dans `usePortalConfig.ts` (§5 du hook) ; lecture par `WifiPortalContent.tsx:66-68` via `modules[key]` (fail-closed : `modules===null` → `false`).

| Module (module_name) | Fichier:ligne du rendu | Table d'activation | Page admin | Contrôle |
|---|---|---|---|---|
| `quiz` | WifiPortalContent (étape engagement) | `portal_enabled_modules.is_enabled` | AdminModules | toggle |
| `video` | WifiPortalContent `:70-78` (watchVideo/extend) | idem | AdminModules | toggle |
| `extend_time` | idem | idem | AdminModules | toggle |
| `mini_games` | `MiniGamesHub.tsx` (lazy `WifiPortalContent.tsx:20`) | idem | AdminModules | toggle |
| `rewards` | `RewardSystem.tsx` (lazy `:18`) | idem | AdminModules | toggle |
| `referral` | `ReferralSystem.tsx` (lazy `:19`) | idem | AdminModules | toggle |
|| `family` | `FamilyManagement.tsx` (lazy `:21`) — **mock-data, module non raccordé** : masqué tant qu'aucune table `family_*` n'existe (ANALYSE-CROISEE §2.4). **Tables `family_profiles`/`family_members` REPORTÉES par le backend** (priorité Bictorys, décision produit 2026-09-17) : le module reste en mock, masqué par défaut (fail-closed). Voir §8.5. | idem | AdminModules | toggle |
| `payment` | `PaymentPortal.tsx` (lazy `:22`) | idem | AdminModules | toggle |

## 8. Ce qui reste hardcodé côté front (dette tracée)

1. **Défauts démo** (`portal-config-defaults.ts`) : autorisés uniquement en démo isolée — à supprimer à la fin de la prod.
2. **OTP `123456`** (`sms-service.ts:113`) : mode dev voulu ; sortie = `DEV_OTP_MODE=false` + vrai fournisseur SMS, pas de retrait silencieux.
3. **Couleur/logo non appliqués au rendu** (lues mais inutilisées — résolu, voir ci-dessous).
   - **RÉSOLU (session 2026-09-17)** : `applyPortalBranding()` dans
     `usePortalConfig.ts` injecte `themeColor` → `--primary`/`--ring` (format
     HSL tailwind/shadcn, validation format + conversion hex→hsl) et
     `logoUrl` → `--portal-logo` + rendu `<img>` dans `WifiPortalContainer`
     (masqué si absent, `onError` le retire si injoignable). Appliqué via
     `useEffect` à la résolution de la config. Aucun effet en démo sans config.
4. **Interval rotation 7 s** (`WifiPortalContainer.tsx:143`).
5. **Famille** : mock (`services/wifi/family/data/`) tant que le module n'est pas activé.
   - **5. Tables `family_*` REPORTÉES** (décision produit 2026-09-17 : le backend
     priorise l'intégration Bictorys — paiement — avant `family_profiles`/
     `family_members`). Vérifié dans `supabase/migrations_schema_dump.sql` :
     aucune table `family_profiles`/`family_members` n'existe dans le schéma
     (seules colonnes liées : `wifi_users.family_id`/`family_role`,
     `wifi_plans.is_family_plan`). Conséquence : le module famille **reste en
     mock, masqué par défaut** (fail-closed — `MANDATORY_ONLY_GATING.family=false`).
     Aucune activation possible même via `portal_enabled_modules` car les services
     (`services/wifi/family/*`) pointent sur des tables inexistantes : un toggle
     admin activé n'afficherait que des données mock — c'est documenté, pas un bug.
     Dépendance backend pour démasquer : migration créant `family_profiles` +
     `family_members` (+ RLS), puis branchement des services family existants.
6. **Logos paiement** : assets statiques.
7. **`ThemeMarketplace` + gestionnaires de thèmes** : non rendus (code mort à fusionner côté admin).
