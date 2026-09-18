# Catalogue des 8 préceptes

Le catalogue est le **miroir exact** de ce que le portail exécute.
Chaque `module_name` est **à la fois** :

1. une ligne de `portal_modules`
2. un flag lu dans `usePortalConfig.ts` (gating)
3. une étape du flow dans `WifiPortalContent.tsx`

**Zéro coquille vide** : tout ce qui est activable dans l'admin a un rendu.

## Les 8 préceptes

| # | module_name | Libellé | Étape (Step) | Composant | Catégorie |
|---|---|---|---|---|---|
| 1 | `payment` | Accès Payant | `PAYMENT` | `PaymentPortal.tsx` | Monétisation |
| 2 | `quiz` | Quiz Marketing | `ENGAGEMENT` (quiz) | `MarketingQuiz.tsx` | Engagement |
| 3 | `video` | Vidéo Publicitaire | `ENGAGEMENT` (video) | `VideoForWifi.tsx` | Engagement |
| 4 | `extend_time` | Temps Offert | `EXTEND_TIME` | `ExtendTimeForWifi.tsx` | Rétention |
| 5 | `mini_games` | Mini-Jeux | `MINI_GAMES` / `LEAD_GAME` | `MiniGamesHub.tsx` + `LeadCollectionGame.tsx` | Engagement |
| 6 | `rewards` | Récompenses | `REWARDS` | `RewardSystem.tsx` | Rétention |
| 7 | `referral` | Parrainage | `REFERRAL` | `ReferralSystem.tsx` | Acquisition |
| 8 | `learning_center` | Learning Center | `LEARNING_CENTER` | `LearningCenter.tsx` | Valeur |

## Réglages (hors catalogue)

Certaines fonctionnalités ne sont **pas des étapes du parcours**. Elles se
configurent dans les onglets de la Forge et **n'occupent pas de slot** sur les 8 :

| Fonctionnalité | Endroit | Raison |
|---|---|---|
| `social_integration` | Onglet Auth (méthode de connexion) | Comme UniFi coche Facebook/Password au même endroit. Se branche sur `sites.auth_method` + boutons OAuth dans `AuthBox`. |
| `targeted_marketing` | Onglet Marketing (audiences) | Segmentation admin : quelle pub / quiz / offre pour quel profil. Pas visible par le visiteur. |

## Retirés (et pourquoi)

| Module | Raison |
|---|---|
| `ai_chat_multilingual` | Retrait demandé. |
| `family` | Les tables `family_*` sont **reportées par le backend**. Le bouton était un mock mensonger — l'activation n'avait aucun effet réel. |
| `auth_sms`, `auth_email` | L'auth est une **config** (`sites.auth_method`), pas une étape du parcours. |
| `video_system`, `mobile_money`, `ecommerce_light` | Aucun rendu côté portail. |
| `social_integration`, `targeted_marketing` | Conservés, mais déplacés en réglages (voir ci-dessus). |

## Historique du problème

Avant la refonte, le catalogue admin comptait **12 modules** dont **7 n'avaient
aucun rendu** côté portail : pas de flag dans `usePortalConfig.ts`, pas
d'étape, pas de composant. Les activer dans l'admin ne changeait rien —
l'admin affichait des boutons mensongers.

À l'inverse, `payment` était un flag côté portail mais **n'existait pas** dans
le catalogue admin.

De plus, `portal_modules` n'était même pas seedée (catalogue vide en
production). La migration `20260919000000_catalogue_8_preceptes.sql` est donc
un **seed propre**, pas une migration de données.

## Fail-closed

`WifiPortalContent.moduleOn()` renvoie `false` si `modules` est `null`
(config non publiée). Sur un vrai site sans config, seuls les modules
obligatoires du parcours restent visibles. Rien n'est simulé.

## Ajouter un précepte

1. Migration : `INSERT INTO portal_modules` avec un `flow_step`
2. `portal-config-defaults.ts` : ajouter à `PortalModuleKey` +
   `ALL_MODULES_ENABLED` + `MANDATORY_ONLY_GATING`
3. `usePortalConfig.ts` : `byName.has("<nom>")`
4. `components/wifi-portal/types.ts` : nouvelle valeur `Step`
5. `WifiPortalContent.tsx` : `case Step.X: return moduleOn(...) ? <Composant/> : null`
6. `lib/admin/modules.ts` : icône dans `ICONS`
7. Le composant lui-même + clés i18n

**Les 7 points sont obligatoires.** Un précepte sans rendu est une régression
— c'est exactement le bug que la refonte a corrigé.
