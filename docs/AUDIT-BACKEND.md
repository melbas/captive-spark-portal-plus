# AUDIT BACKEND — Portail Captif WiFi Spark (Supabase)

Projet Supabase : `pvplhqzzhmqseyzooags` (eu-west-3, ACTIF) — Postgres + RLS + 8 Edge Functions (Deno).
Audit effectué en lecture seule via l'API Management SQL (`pg_policies`, `pg_class`, `information_schema`), inspection du code `supabase/functions/*` et `src/services/*`. **Aucune donnée ni code modifié.**

---

## A) Cartographie du schéma réel

**52 tables publiques.** Le schéma réel n'est PAS versionné : les 4 migrations locales (`supabase/migrations/`) ne couvrent que `sites`, `resellers`, `hardware_integrations` et leurs politiques admin. 48 tables sur 52 existent uniquement dans la base live — risque de dérive irreproductible majeur.

### Comptages réels (SELECT count(*), 2026-09)

| Table | Lignes | État |
|---|---|---|
| events | 670 | **active** |
| wifi_sessions | 113 | **active** |
| wifi_users | 49 | **active** |
| portal_statistics | 11 | active |
| portal_modules (12), ai_providers_config (5), loyalty_levels (5), access_profiles (4), chat_knowledge_base (4), portal_themes (4), wifi_plans (3) | — | **données de référence** (seed) |
| audit_config, auth_config, auth_otp_config, portal_config, sites, transactions, user_roles | 1 chacun | configurées, peu de trafic |
| **ad_videos, games, payment_methods, quizzes, quiz_questions, quiz_options, rewards, vouchers, radius_sessions, radius_coa_requests, resellers, hardware_integrations, chat_conversations, chat_messages, chat_analytics, referrals, user_segments, user_segment_memberships, user_access, portal_customizations, portal_enabled_modules, portal_customer_journeys, portal_analytics, pc_admin_users, pc_audit_logs, admin_audit_logs, admin_sessions, security_alerts, incidents_tracking, qoe_measurements, site_availability_metrics, auth_funnel_metrics, financial_kpis, customer_satisfaction_metrics** | **0** | **vides / abandonnées ou jamais alimentées** (29 tables) |

⚠️ Notable : `hardware_integrations` et `resellers` sont **vides** alors que `authorize-guest` en dépend — le flux UniFi n'a jamais tourné en conditions réelles. `pc_audit_logs` (0) sert pourtant de **stockage OTP en production** (voir C).

### Points saillants du schéma

- **wifi_users** : `id uuid PK, auth_method NOT NULL, email/phone/name NULL, mac_address, site_id FK, loyalty_points, loyalty_pts` (doublon de colonnes fidélité !), `family_id`, `referral_code UNIQUE`, `churn_risk`, `ai_segment`. Colonnes `phone`/`email` sans contrainte UNIQUE → doublons possibles par site.
- **wifi_sessions** : FK user/plan/transaction/site, `mac_address`, `status` (défaut 'active'), `expires_at`, `ended_at`. Pas de contrainte CHECK sur `status`.
- **transactions** : `amount numeric NOT NULL`, `status NOT NULL` (sans CHECK d'énumération), FK plan/site/user/payment_method, `wave_checkout_id`, `commission_fcfa`.
- **portail** : `portal_config` 1:N `portal_customizations`, `portal_enabled_modules` (UNIQUE config+module), `portal_customer_journeys` ; `portal_modules` (module_name UNIQUE, CHECK type mandatory/optional/premium) ; `portal_themes` (CHECK theme_type).
- CHECK métier pertinents : `vouchers_check (used_count <= use_limit)`, `radius_coa_requests (status, request_type)`, `radius_sessions (state)`, `hardware_integrations (brand)`, `sites (type)`, `pc_admin_users (role)`.
- Aucune table `family_profiles` / `family_members` n'existe côté DB alors que le front expose toute une famille de services dédiés (voir D).

### Tables vides vs actives — verdict

Actives réellement : `events`, `wifi_sessions`, `wifi_users`, `portal_statistics` + seed de référence. Tout le reste (dont paiement, Radius, vouchers, fidélité, chat) est **non utilisé ou non alimenté** → à archiver/documenter.

---

## B) Risques RLS / sécurité (classés)

### 🔴 CRITIQUES

1. **`wifi_users_portal_anon_insert` (anon, WITH CHECK `true`)** : n'importe quel visiteur anonyme peut créer des lignes arbitraires dans `wifi_users` (dont `is_blocked`, `churn_risk`, `loyalty_pts`, `ai_segment`) et **`wifi_users_public_read_by_site` (anon+authenticated, USING `true`)** expose **toute la table** (téléphones, emails, MAC, codes referral) publiquement. Enumération de données personnelles triviale via l'API REST Supabase.
2. **`wifi_sessions` anon INSERT/SELECT/UPDATE avec USING/WITH `true`** : lecture et modification de toutes les sessions de tous les sites (contournement d'accès WiFi, usurpation de `status`/`expires_at`).
3. **Bypass OTP universel `123456` codé en dur dans `verify-otp`** (`isDemoCode`) **ET** dans `sms-service.ts` côté front (ligne `code === '123456'`) : connexion en tant que n'importe quel numéro/email, sans avoir reçu de code. De plus `send-otp` renvoie le code dans la réponse HTTP (`devCode`) dès que `SMS_API_KEY` est absent — c'est le mode par défaut.
4. **Edge Functions sans authentification** : `send-otp`, `verify-otp`, `authorize-guest`, `revoke-session`, `create-wave-payment`, `create-om-payment` n'**aucune vérification** du JWT ni de l'apikey appelant (pas de `verify_jwt` exploité, pas de check `Authorization`). `authorize-guest` et `revoke-session` sont appelables par quiconque connaît l'URL → **autorisation/révocation UniFi gratuite** (aucun paiement vérifié, aucun webhook signature exigé).
5. **Mots de passe contrôleur UniFi en clair** : `hw.api_password_enc` utilisée telle quelle (`// TODO: decrypt with ENCRYPTION_KEY`) dans `authorize-guest`, `revoke-session`, `test-hardware-connection`. Nomme « _enc » mais stocke/appelle en clair ; de plus `authorize-guest` fait `select("*")` sur `hardware_integrations`.

### 🟠 ÉLEVÉS

6. **OTP stockés dans `pc_audit_logs` en clair** (`details: {code, ...}`) avec suppression par champs non indexés — détournement d'une table d'audit comme stockage de session, sans hachage, TTL non garanti, et journal d'audit de fait pollué.
7. **Aucun rate limiting OTP** : `send-otp` est appelable en boucle (pas de limite par IP/identifiant, coût SMS libre une fois le provider branché) ; `verify-otp` limite à 5 tentatives **par OTP existant** mais le bypass 123456 court-circuite tout.
8. **Webhook Wave : signature vérifiée SEULEMENT si `WAVE_WEBHOOK_SECRET` est défini** (fail-open). Non configuré = n'importe qui peut POSTer `checkout.session.completed` et déclencher l'autorisation WiFi + marquer la transaction `completed`. Pas de vérification du montant payé vs `tx.amount`, pas de vérification que l'événement vient de Wave (IP/UA), pas d'idempotence (rejeu de webhook → re-authorize, +10 points fidélité à chaque appel).
9. **`create-wave-payment`/`create-om-payment` sans auth** : n'importe qui crée des transactions pending avec des `userId` arbitraires ; la commande `success_url`/`error_url` de Wave pointe sur le **webhook avec query params** — logique de statut mélangée dans la même fonction que le webhook signé.
10. **Tables back-office avec policy « No access » (USING false)** : `portal_config`, `portal_customizations`, `portal_enabled_modules`, `portal_customer_journeys`, `referrals` — inaccessible au client **et** uniquement via service_role : le portail public ne peut donc pas lire sa config ; il faut soit une policy SELECT publique contrôlée, soit passer par une Edge Function. Tables de métriques admin (`*_metrics`, `admin_audit_logs`, `security_alerts`, `ai_providers_config`, `auth_config`, `auth_otp_config`, `audit_config`) : policy ALL sur `public` pour la 1ʳᵉ trouvée dans plusieurs cas (ex. `No access cmd=ALL roles={public}`) — correct car USING false, mais fragile et illisible (policies dupliquées en doublons sur `wifi_users` (12), `wifi_sessions` (11), `transactions` (9), `chat_messages` (9), `events` (5) — dette de maintenance élevée, risque de contradiction silencieuse).

### 🟡 MOYENS

11. **CORS `*` sur toutes les Edge Functions** + réponses d'erreur verbeuses (`err.message` renvoyé au client).
12. **Écritures front avec clé anon** : `user-service` insert/update `wifi_users` (id généré côté client avec uuidv4 !), `session-service` insert/update `wifi_sessions`, `statistics-service` read-modify-write de `portal_statistics` (race condition, compteurs incrémentables à volonté par un script) — les policies anon `true` ci-dessus rendent tout ceci possible.
13. **`revoke-session`/`authorize-guest` : erreurs UniFi avalées** (`catch` → simple log, `unifiSuccess` peut être false mais la réponse reste `success: true`) ; `sessionErr` loggé puis ignoré ; `increment_loyalty_points` en `.catch()` avec fallback **écrasant** `loyalty_pts` à 10 au lieu d'incrémenter.
14. **Pas de contrainte UNIQUE sur `wifi_users.phone`/`email`** (par site) → race dans `verify-otp` find-or-create, doublons de comptes.
15. **Secrets front** : `.env` committé avec `VITE_SUPABASE_*` (normal pour anon key, mais vérifier qu'aucune service_role ne transite) ; aucune occurrence de service_role trouvée dans `src/` (bon point). `SUPABASE_ACCESS_TOKEN` présent en clair dans `~/.bashrc` — à déplacer dans un gestionnaire de secrets.
16. **Schéma non versionné** : 48/52 tables absentes des migrations — impossibilité de reconstruire/restaurer l'infra, pas de `supabase db pull` à jour.
17. **RGPD/consentement** : collecte de téléphones + MAC sans registre de traitement, sans politique de rétention (`wifi_sessions.mac_address` conservé indéfiniment), sans consentement explicite dans le flux OTP, données personnelles lisibles publiquement (cf. #1). Aucune fonction de purge/anonymisation.

---

## C) Audit des Edge Functions

| Function | Auth appelant | Injection/entrées | Idempotence | Verdict |
|---|---|---|---|---|
| **send-otp** | aucune | OK (validation minimale) | delete+insert OTP (ok) | 🔴 devMode par défaut sans `SMS_API_KEY`, code renvoyé au client, stockage OTP en clair dans `pc_audit_logs`, pas de rate limit, TODO SMS |
| **verify-otp** | aucune | OK | OTP supprimé après usage (ok) | 🔴 bypass 123456 dur, expiration/attempts contournés par le bypass, race find-or-create user, aucune session JWT émise (retourne juste userId — pas de preuve d'authentification exploitable ensuite) |
| **authorize-guest** | **aucune** | mac non validée (regex) | ❌ re-authorize à chaque appel, +10 pts à chaque appel | 🔴 appelable librement, mdp UniFi en clair, `select *` sur hardware_integrations, erreurs UniFi avalées, fallback fidélité écrasant |
| **revoke-session** | **aucune** | sessionId quelconque | répétible (ok) | 🔴 révocation arbitraire de sessions, mdp en clair, pas de vérification que l'appelant est légitime |
| **create-wave-payment** | aucune | ✅ prix lu côté serveur (bon point) | création tx répétée possible | 🟠 sans auth ; mock si clé absente ; success_url mal conçue (pointe sur le webhook) |
| **create-om-payment** | aucune | ✅ | — | 🟠 TODO complet : l'API Orange Money n'est pas implémentée, retourne « mode démo » même en prod si clé absente |
| **wave-webhook** | signature HMAC **conditionnelle** (fail-open) | parse JSON brut | ❌ pas d'idempotence (rejouable), montant non vérifié | 🔴 à durcir absolument : secret obligatoire, vérif montant, idempotence sur event id |
| **test-hardware-connection** | **aucune** | siteId | — | 🟠 fonction d'outillage exposée publiquement, permet de tester des logins contrôleur et d'exfiltrer l'existence/état du matériel ; mdp en clair |

Secrets : tous via `Deno.env` (bonne pratique) ; `SUPABASE_SERVICE_ROLE_KEY` utilisé partout (nécessaire mais justifie une auth d'appel forte) ; `WAVE_SECRET_KEY`, `ORANGE_MONEY_API_KEY` (absente), `WAVE_WEBHOOK_SECRET` (optionnelle = danger), `DEV_OTP_MODE`, `DEV_OTP_FIXED_CODE`.

---

## D) Plan de remédiation priorisé

**P0 — avant toute exposition publique (semaine 1)**
1. Désactiver le bypass `123456` dans `verify-otp` **et** `sms-service.ts` ; rendre `devCode` conditionné à un flag de build impossible en prod.
2. Rendre la signature Wave **obligatoire** (échouer fermé si `WAVE_WEBHOOK_SECRET` absent), vérifier le montant (`event.data.amount === tx.amount`) et implémenter l'idempotence (table `processed_webhook_events` ou check `status !== 'pending'`).
3. Authentifier toutes les Edge Functions : exiger un JWT valide (config `verify_jwt`) ou un secret partagé pour `authorize-guest`/`revoke-session`/`test-hardware-connection` ; `wave-webhook` appelle `authorize-guest` avec la service_role.
4. Verrouiller les policies anon : `wifi_users_public_read_by_site` → SELECT limité aux colonnes non sensibles via vue (`wifi_users_public`) ou USING `site_id = ... AND is_blocked = false` + suppression de colonnes sensibles du scope ; `wifi_sessions_portal_anon_*` → INSERT seulement avec `user_id` fourni par le backend, UPDATE restreint (`status='ended' AND expires_at < now()`), SELECT supprimé.
5. Supprimer/rétablir le mot de passe UniFi chiffré (pgcrypto + `ENCRYPTION_KEY` en secret Edge, decrypt au moment de l'usage), remplacer le TODO.
6. Rate limiting OTP : table de compteur ou Supabase Edge rate limit (ex. 3 SMS/heure/identifiant, 10/jour/IP).

**P1 — consolidation (2-4 semaines)**
7. `supabase db pull` + commit des migrations du schéma réel ; purger les tables mortes (29 vides) ou documenter leur usage prévu.
8. Unifier les policies dupliquées (12 sur wifi_users, 11 sur wifi_sessions…) : une policy par action et par rôle, tests pgTAP.
9. Créer les tables `family_profiles` / `family_members` réelles OU retirer les services famille mockés du bundle front.
10. Remplacer le read-modify-write de `portal_statistics` par une fonction Postgres `increment_statistic(field)` atomique (SECURITY DEFINER, grant execute anon limité).
11. Retours d'erreur génériques, CORS restreint aux domaines Vercel, validation d'entrée (zod) sur toutes les fonctions.
12. Ajouter UNIQUE(site_id, phone) / UNIQUE(site_id, email) sur `wifi_users` (ou UNIQUE global), hash SHA-256 du code OTP avant stockage.

**P2 — conformité & exploitation**
13. RGPD : page de consentement avant OTP, registre des traitements, rétention `wifi_sessions.mac_address` (ex. 12 mois) via cron de purge, droit d'accès/suppression.
14. Activer PITR + backups testés, alerting sur `security_alerts`, journal d'audit dédié (sortir les OTP de `pc_audit_logs`).
15. Versionner les Edge Functions en CI (lint + tests déno) ; surveiller les logs Supabase.

---

## E) Architecture cible — pilotage de la personnalisation depuis le back office

**Principe : le client (anon) ne lit que des vues/tables « publiables » en lecture seule ; toute écriture passe par des rôles authentifiés (admin back office) ou la service_role côté Edge.**

```
Back office (React admin, auth Supabase authenticated + user_roles role='admin')
   │  écrit direct via PostgREST
   ▼
portal_config ─┬─ portal_themes        policies:
portal_modules │─ portal_enabled_modules   SELECT: anon (contenu publié) + authenticated
portal_customizations ◄─ admin (is_admin_user()/has_role('admin')) en INSERT/UPDATE/DELETE
               └─ portal_customizations    versionnées (portal_version++) via trigger
```

1. **Lecture publique** : policies SELECT anon/authenticated sur `portal_config` (filtrées `portal_status = 'active'`), `portal_modules`, `portal_themes`, `portal_enabled_modules`, `portal_customizations` — avec `public_read_*` limité aux lignes actives, à l'image de `public_read_active_sites` qui existe déjà sur `sites` et `wifi_plans`. RAS pour `ad_videos`, `games`, `quizzes`, `rewards` (déjà « Allow public read »).
2. **Écriture back office** : une seule policy `ALL TO authenticated USING (is_admin_user())` par table de personnalisation (supprimer les doublons) ; audit via trigger → `admin_audit_logs` (table aujourd'hui vide, à activer).
3. **Écriture client (anon)** : aucune écriture directe ; les seules mutations restantes côté portail passent par Edge Functions authentifiées (`verify-otp` crée le user, `authorize-guest` crée la session, `create-*-payment` crée la transaction) — le front n'appelle plus jamais `.insert()` sur `wifi_users`/`wifi_sessions`/`portal_statistics`.
4. **Statistiques** : incrément via RPC SECURITY DEFINER + table `portal_statistics` avec policy SELECT admin only (déjà en place), pas d'UPDATE anon.
5. **Publications** : `portal_config.portal_version` incrémenté par trigger à chaque modification ; le portail public met en cache (SWR/`stale-while-revalidate`) et sert `custom_css`/`theme_color` depuis la vue publique — la personnalisation devient 100 % pilotable du back office sans redéploiement Vercel.

---

*Fin du rapport — audit lecture seule, aucune modification appliquée.*
