# RAPPORT BACKEND — Sécurisation P0 + multi-tenant SaaS (lot initial)

> **Livrable pour revue — RIEN n'a été appliqué au live** (pvplhqzzhmqseyzooags).
> Aucune mutation live effectuée par cet agent (aucune requête d'écriture SQL,
> aucun `db push`, aucun `secrets set`, aucun `migration repair`). Le seul
> accès au projet a été un `supabase db dump` **en lecture seule**.
> Conformément à la consigne corrigée : migrations locales réversibles +
> modifications Edge Functions locales, à déployer après revue.

## 1. Choix de réutilisation (pas de réinvention)

- **AES-256-GCM WebCrypto** (standard Deno) pour le secret UniFi, plutôt que
  pgSQL-side pgcrypto : la clé ne quitte jamais les secrets Edge (pgcrypto
  nécessiterait de passer la clé dans chaque requête SQL, ce qui la ferait
  transiter par les logs). `pgcrypto` est quand même activé dans la migration
  pour `digest()` (hash d'identité de la vue publique).
- **HMAC-SHA256 natif** (`crypto.subtle`) + comparaison à temps constant
  maison (`timingSafeEqual`) — pattern officiel des webhooks Stripe/Wave.
- **Idempotence webhook** via table dédiée `processed_webhook_events`
  (recommandation officielle Supabase pour les webhooks) + check
  `status != 'pending'`.
- **Rate limiting OTP** : table-compteur `otp_send_rate_limits` avec buckets
  heure/jour (pattern trivial et auditable ; les lib Deno de rate-limit
  mémoire ne survivent pas aux redémarrages d'isolate).
- **RLS multi-tenant** : pattern officiel Supabase « fonction SECURITY DEFINER
  STABLE + policy » (`is_admin_user`, `can_access_site`), search_path fixé
  (durcissement standard).

## 2. Fichiers créés / modifiés

**Migrations SQL (locales, préfixe timestamp, non appliquées)**
- `supabase/migrations/20260917090000_p0_security_hardening.sql`
- `supabase/migrations/20260917090100_multi_tenant_rbac.sql`
- `supabase/migrations/20260917090200_portal_public_read_and_rpcs.sql`

**Edge Functions (locales, non redéployées)**
- `supabase/functions/_shared/crypto.ts` (NOUVEAU : encrypt/decrypt AES-GCM)
- `supabase/functions/_shared/auth.ts` (NOUVEAU : auth serveur réel)
- `supabase/functions/send-otp/index.ts` (DEV_OTP_MODE strict + rate limit)
- `supabase/functions/verify-otp/index.ts` (bypass conditionné + flag demo)
- `supabase/functions/authorize-guest/index.ts` (auth serveur + decrypt)
- `supabase/functions/revoke-session/index.ts` (auth serveur + decrypt)
- `supabase/functions/test-hardware-connection/index.ts` (admin-only + decrypt)
- `supabase/functions/wave-webhook/index.ts` (fail-closed + montant + idempotence)

**Config & versionnage**
- `supabase/config.toml` (verify_jwt = true partout sauf wave-webhook)
- `supabase/migrations_schema_dump.sql` (NOUVEAU : dump complet du schéma live,
  lecture seule — baseline de versionnage en attendant un `db pull` propre)
- `supabase/roles_dump.sql` (NOUVEAU : dump des rôles)
- `docs/RAPPORT-BACKEND.md` (ce fichier)

## 3. Détail des changements

### 3.1 Bypass OTP 123456 (P0-a)
- `verify-otp` : `isDemoCode` n'est vrai QUE si `DEV_OTP_MODE === "true"` ET
  code === 123456. Sans le secret, 123456 est rejeté comme un mauvais code.
- `send-otp` : le mode démo (code fixe + `devCode` renvoyé dans la réponse) est
  STRICTEMENT conditionné à `DEV_OTP_MODE === "true"`. Le comportement
  « actif si SMS_API_KEY absent » est supprimé.
- **Séparation démo / réseau réel** : `verify-otp` renvoie `demo: true` quand le
  code démo est utilisé ; `authorize-guest` refuse alors d'autoriser un client
  sur le contrôleur UniFi réel (message "Demo session — skipped"). Un code 123456
  ne donne JAMAIS d'accès à du matériel réseau réel.
- **La config live n'a PAS été modifiée** pour forcer le dev globalement :
  `DEV_OTP_MODE` est un secret Edge à définir uniquement pour l'environnement
  de démo (`npx supabase secrets set DEV_OTP_MODE=true` — voir §4).

### 3.2 wave-webhook fail-closed + montant + idempotence (P0-b)
- `WAVE_WEBHOOK_SECRET` absent → **503** (avant : signature vérifiée seulement
  si le secret existait = fail-open).
- Comparaison HMAC à temps constant.
- **Montant** : `event.data.amount >= transactions.amount` exigé, sinon 402.
- **Idempotence** : `processed_webhook_events` (PK event_id, service_role
  only) + rejeu → no-op 200 `duplicate:true` ; le traitement ne s'exécute que
  sur `status === 'pending'`.
- Le webhook loggue désormais `eventType` seul (plus de payload brut).

### 3.3 verify_jwt réactivé (P0-c)
- `config.toml` : `verify_jwt = true` sur les 8 fonctions SAUF wave-webhook.
- ⚠️ Conformément à la correction : verify_jwt seul accepte le JWT anon et ne
  constitue PAS une autorisation. Les fonctions sensibles font une vraie
  vérification serveur via `_shared/auth.ts` :
  1. secret interne `x-internal-secret` (machine-à-machine, wave-webhook →
     authorize-guest) ;
  2. JWT vérifié (`auth.getUser`) puis `is_super_admin()` / `can_access_site(site)`
     (fonctions SECURITY DEFINER) ;
  3. visiteur : preuve de session liée au site (l'utilisateur JWT doit exister
     dans `wifi_users` pour CE site, non bloqué) — créée par `verify-otp`
     (backend), jamais par le front.
- `create-wave-payment` / `create-om-payment` : verify_jwt activé, mais leur
  logique interne n'a pas encore été durcie (identité de l'appelant à
  vérifier avant insertion de transaction) → voir §7.

### 3.4 Policies anon restreintes (P0-d)
- `wifi_users` : INSERT anon `WITH CHECK true` et SELECT anon `USING true`
  **supprimés**. Conformément à la correction : AUCUN accès anon aux users,
  même limité par champs. Les créations se font dans `verify-otp`
  (service_role) ; la lecture PII reste réservée à l'admin authentifié.
- `wifi_sessions` : INSERT/SELECT/UPDATE anon **supprimés**. Les sessions sont
  créées par `authorize-guest` (service_role) ; l'UPDATE de fin de session
  passe par les Edge Functions.
- Vue `wifi_users_public` (admin-only, PII masquée + hash SHA-256) disponible
  pour le back office ; **aucun grant anon**.
- ⚠️ Impact front (agent back office) : `src/services/wifi/user-service.ts`,
  `session-service.ts` et `statistics-service.ts` écrivent/llisent aujourd'hui
  en anon → à remplacer par des appels Edge Functions (contrat §6.2). Tant que
  ce n'est pas fait, le déploiement des policies cassera ces écritures —
  d'où l'ordre recommandé : Edge Functions d'abord (déjà modifiées), puis
  front, puis policies.

### 3.5 Chiffrement du mot de passe UniFi (P0-e)
- Format : `enc:gcm:<iv_b64>:<ct_b64>` dans `api_password_enc` (AES-256-GCM).
- Les 3 fonctions (`authorize-guest`, `revoke-session`,
  `test-hardware-connection`) déchiffrent à l'usage via
  `_shared/crypto.ts:decryptSecret` ; elles échouent 503 si `ENCRYPTION_KEY`
  est absente (fail-closed) — plus de TODO ni d'utilisation en clair.
- Valeurs legacy en clair : acceptées transitoirement avec un warning
  (migration progressive), à re-chiffrer via un script admin à prévoir.
- `select("*")` remplacé par les colonnes nécessaires partout.

### 3.6 Rate limiting OTP (P0-f)
- `send-otp` : 3 envois/heure/identifiant, 10/jour/IP (table
  `otp_send_rate_limits`, upsert compteur). 429 au-delà.

### 3.7 Multi-tenant (migration 2)
- Rôles : `super_admin / reseller / site_manager / viewer` ajoutés à l'enum
  `app_role` (reversibilité documentée — PostgreSQL n'efface pas les valeurs).
- `user_roles` : colonnes `reseller_id`, `site_id` → supporte les clients
  SANS revendeur (reseller_id NULL + site_id direct) : contrat org/memberships
  minimal, sans modèle de commission (non validé produit — volontairement
  hors lot).
- `can_access_site(site_id)` : super_admin → tout ; reseller → ses sites
  (JOIN sites.reseller_id) ; site_manager/viewer → leur site.
- `is_admin_user()` étendu, `is_viewer()` = lecture seule.
- Policies métier `wifi_users` / `wifi_sessions` / `transactions` : les ~8
  policies authenticated dupliquées sont remplacées par 2 policies scoppées
  par table (select périmètre + write périmètre, viewer exclu en écriture).
  Les policies "self" existantes sont conservées.
- Nettoyage des doublons sur `pc_admin_users` / `user_roles`.

### 3.8 Versionnage (mission 3)
- `db pull` refusé par le CLI : l'historique de migrations live contient des
  entrées orphelines (28 timestamps inconnus du repo). Le `supabase migration
  repair` demandé par le CLI **écrit dans l'historique live** → volontairement
  NON exécuté (consigne : pas de mutation live). À faire lors du déploiement :
  exécuter les `migration repair --status reverted ... --status applied ...`
  listés par le CLI, puis `db pull`.
- En attendant : `supabase/migrations_schema_dump.sql` = snapshot fidèle du
  schéma live (3193 lignes, 52 tables, 174 policies) committé pour revue.
- **Archivage des 29 tables vides : volontairement NON réalisé** (une table
  vide ne prouve pas l'inutilité). Liste et verdict par table : à qualifier en
  revue produit ; option retenue = schéma `archive` documenté plutôt que DROP.
- Policies dupliquées (12 wifi_users, 11 wifi_sessions…) : nettoyées dans la
  migration 2 pour les tables métier ; les autres tables (transactions 9,
  chat_messages 9, events 5) restent à faire — listées §7.
- Fidélité : `loyalty_pts` conservée comme source de vérité ; RPC atomique
  `increment_loyalty_pts` (SECURITY DEFINER, service_role only) ;
  **loyalty_points n'est PAS dropée** (colonne live) : trigger de sync +
  backfill dans la migration, suppression en migration dédiée après refonte
  front.

### 3.9 Lecture publique de la config (mission 4, PLAN-FINAL §4/6)
- SELECT anon/authenticated limité aux lignes actives : `portal_config`
  (portal_status='active'), `portal_customizations`/`portal_enabled_modules`
  (JOIN config active), `portal_customer_journeys` (is_active),
  `portal_modules`, `portal_themes`. (ad_videos/games/quizzes/rewards ont déjà
  "Allow public read" active=true — inchangés.)
- Écriture : une policy `ALL TO authenticated` (`is_admin_user() && !viewer`)
  par table de personnalisation + contenus.
- Trigger `portal_config_bump_version` : `portal_version++` à chaque UPDATE.
- `increment_statistic(field)` : atomique (upsert par date), whitelist
  stricte de colonnes, SECURITY DEFINER, **exécutable uniquement par
  service_role** (aucun grant anon — correction appliquée : pas d'incrément
  arbitraire accessible du portail). Le portail appelle une Edge Function
  authentifiée qui choisit le champ, pas le front directement.
- CORS : réduit à `ALLOWED_ORIGIN` (secret, sinon `*` en dev) — à noter : ce
  n'est PAS une mesure de sécurité (consigne), simplement hygiène.

## 4. Secrets à définir (via `npx supabase secrets set`, lors du déploiement)

| Secret | Rôle | Remarque |
|---|---|---|
| `DEV_OTP_MODE=true` | Active le code démo 123456 + devCode | UNIQUEMENT sur l'env de démo. Ne JAMAIS définir en prod. |
| `WAVE_WEBHOOK_SECRET` | HMAC du webhook Wave | Le webhook renverra 503 tant qu'il est absent. |
| `ENCRYPTION_KEY` | Clé AES-256-GCM (32 bytes, hex ou base64) | Chiffrement du mot de passe UniFi. Générer : `openssl rand -hex 32`. |
| `INTERNAL_FUNCTION_SECRET` | Auth machine-à-machine entre Edge Functions | wave-webhook → authorize-guest. Générer : `openssl rand -hex 32`. |
| `ALLOWED_ORIGIN` (optionnel) | CORS du portail | Hygiène seulement, pas de sécurité. |

## 5. Changements de comportement (bout en bout démo)

1. **Démo** : OTP 123456 continue de fonctionner SEULEMENT après
   `secrets set DEV_OTP_MODE=true` sur le projet. Sans ce secret, la démo OTP
   est cassée (comportement voulu : la prod ne doit pas être ouvert par défaut).
2. **Parcours portail** : le reste du parcours (config, plans, sessions démo
   sans matériel UniFi) est inchangé. `authorize-guest` sans intégration
   matérielle reste "demo mode" (session créée sans UniFi).
3. **Front** : tant que user-service/session-service/statistics-service écrivent
   en anon, l'application des policies les bloquera — coordonner avec l'agent
   back office (les Edge Functions sont déjà prêtes).
4. **Webhook Wave** : 503 tant que `WAVE_WEBHOOK_SECRET` n'est pas défini.
5. **Vérification build** : `npx tsc -p tsconfig.app.json --noEmit` passe
   (les Edge Functions Deno ne sont pas couvertes par ce tsconfig ; revue
   manuelle faite, LSP signale uniquement `Deno`/URLs esm.sh non résolues,
   normal hors runtime Deno). Une erreur tsc pré-existante chez l'agent front
   (`src/hooks/usePortalConfig.ts` TS2589) — hors de mon territoire.

## 6. Contrat API pour l'agent front

- `POST /functions/v1/send-otp` {phone|email, siteId} → {success, expiresIn,
  devMode?, devCode?} (devCode si DEV_OTP_MODE) ; 429 si rate-limited.
- `POST /functions/v1/verify-otp` {phone|email, code, siteId} →
  {success, userId, siteId, isNew, demo}. **L'userId devient la preuve de
  session visiteur** à passer aux appels suivants.
- `POST /functions/v1/authorize-guest` (Authorization: Bearer JWT visiteur ou
  admin) {mac, siteId, planId, userId, transactionId?, demo?} → session.
- `POST /functions/v1/revoke-session` (auth visiteur propriétaire/admin).
- Statistiques : plus d'écriture front directe → Edge Function à créer
  (P1) qui appelle `rpc('increment_statistic', {p_field})` en service_role.

## 7. Bictorys — abstraction de paiement provider-agnostic (tranche 2)

> Décision produit (2026-09-17, Abdoulaye) : **Bictorys** (agrégateur ouest-africain)
> devient le provider de paiement PRINCIPAL. Wave / Orange Money directs restent
> disponibles en **fallback** sous la même abstraction — ils ne sont PAS supprimés.
> Le paiement devient **asynchrone** : le webhook est la source de vérité.

### 7.1 Couche d'abstraction — `supabase/functions/_shared/payment/`

| Fichier | Rôle |
|---|---|
| `provider.ts` | Contrat `PaymentProvider` + types `ChargeParams`/`ChargeResult` + `PaymentProviderError` (retryable / invalidConfig) |
| `registry.ts` | **Sélection** du provider : `sites.payment_provider` > `PAYMENT_PROVIDER` (env) > `bictorys`. Fail-closed : pas de bascule silencieuse de provider. `assertProviderConfigured()` rejette si les secrets manquent (503). |
| `providers/bictorys.ts` | Provider principal : `POST {API_URL}/pay/v1/charges?payment_type=`, clé publique uniquement, backoff exponentiel sur 403 HTML (WAF rate-limit), 403 JSON = clé invalide (non retryable) |
| `providers/wave.ts` | Fallback direct (API Wave checkout) |
| `providers/orange.ts` | Fallback direct — fail-closed : l'API OM v2 SN n'est pas implémentée ; en pratique OM passe par Bictorys (`payment_type=orange_money`) qui renvoie le **code USSD** (`#144*82#`) |
| `providers/index.ts` | Assemblage des providers (runtime Deno uniquement — garde `registry.ts` testable en Node sans réseau) |
| `webhook.ts` | `verifyWebhookSignature()` : HMAC-SHA256(`${timestamp}.${rawBody}`), replay protection 5 min, comparaison à temps constant, fallback secret statique |
| `status.ts` | Mapping des statuts providers → interne (`succeeded/processing/pending/failed/cancelled/refunded`) |
| `env.ts` | Lecture d'env compatible Deno **et** Node (tests) |
| `payment.test.cjs` | 47 tests (voir §7.4) |

**Comment un site choisit son provider** : colonne `sites.payment_provider`
(`bictorys` | `wave` | `orange`, NULL = `PAYMENT_PROVIDER` global, défaut
`bictorys`). Surcharge ponctuelle : paramètre `provider` de `create-charge`.

### 7.2 Edge Functions

- **`create-charge`** (NOUVEAU, point d'entrée unique, `verify_jwt = true`) :
  authentification serveur via `_shared/auth.ts` (admin `is_admin_user()` /
  `can_access_site()`, **ou** preuve de session visiteur issue de `verify-otp`),
  montant **toujours relu en base** (`wifi_plans.price_fcfa`, forfait du site et
  actif), idempotence (`idempotencyKey` rejoue la transaction existante ; le
  préfixe `pc-` est réservé au serveur pour éviter le rejeu d'une transaction),
  URLs succès/erreur construites serveur, commission revendeur conservée,
  audit `payment_initiated` (porte la MAC pour `authorize-guest`).
- **`bictorys-webhook`** (NOUVEAU, `verify_jwt = false`) : fail-closed 503 si
  `BICTORYS_WEBHOOK_SECRET` absent, HMAC + replay 5 min + fallback statique,
  idempotence via `processed_webhook_events`, **vérification du montant payé**
  (402 si insuffisant), mapping statut → `transactions.status`, déclenche
  `authorize-guest` (appel interne authentifié) à la confirmation. **Les webhooks
  test et prod sont séparés côté Bictorys — configurer les deux.**
- **`create-wave-payment`** / **`create-om-payment`** (DURCIS — §3.3 était le
  dernier trou) : ces deux fonctions historiques appliquent maintenant les mêmes
  protections (identité, montant relu en base, idempotence, audit). Elles ne
  réimplémentent rien : `create-wave-payment` utilise le provider `wave` de
  l'abstraction. ⚠️ **DEPRECATED** : le front doit migrer vers `create-charge`.
  Fini aussi la simulation de succès quand le secret manque : la transaction
  reste `pending` (fail-closed, aucun accès Internet débloqué).
- `wave-webhook` : **inchangé**.

### 7.3 Migration — `20260918000000_payment_provider_abstraction.sql`

Additive, idempotente, réversible (ROLLBACK documenté) :
`transactions.provider` / `provider_transaction_id` / `provider_payment_reference`
(+ index uniques pour l'idempotence), `sites.payment_provider`, `processed_webhook_events.payload`.
Vérifiée contre `migrations_schema_dump.sql` (aucune de ces colonnes n'existe au live).
⚠️ Contient 2 `UPDATE` de backfill des transactions legacy (provider implicite
depuis `method`) — à exécuter en connaissance de cause lors du déploiement.

### 7.4 Tests — 47/47 passent (`bash supabase/run-tests.sh`)

Sans aucun appel réseau (sandbox `vm` + `Deno.env`/`fetch` stubbés) :
sélection du provider (site > env > défaut, inconnu → erreur, casse), mapping de
statut Bictorys→interne (fail-closed : statut inconnu = jamais `succeeded`),
signature webhook (HMAC correct, mauvaise signature, replay > 5 min, replay
futur, signature sans timestamp, cross-secret, fallback statique, aucun
mécanisme), format téléphone E.164 strict (refus des numéros sans indicatif),
`createCharge` (montant < 100, téléphone non E.164, méthode non supportée,
clé absente, succès 201 complet, 403 JSON invalidConfig non retryable,
403 HTML WAF retryable après backoff = 5 tentatives, retry réussit).

## 8. Contrat front — LE PAIEMENT DEVIENT ASYNCHRONE

À transmettre à l'agent portail (changement de parcours) :

1. **Point d'entrée unique** : `POST /functions/v1/create-charge`
   `{ planId, siteId, method, mac, idempotencyKey, customerPhone, customerEmail }`
   (header `Authorization: Bearer <JWT visiteur ou admin>`).
2. **La réponse n'est PAS un succès de paiement** : `{ transactionId, provider,
   providerTransactionId, redirectUrl, link, qrCode, message, status }`.
   - Wave : `link` = deep link à ouvrir dans l'app Wave (ou `redirectUrl`).
   - Wave via Bictorys : peut renvoyer `qrCode` (base64 PNG) à afficher.
   - Orange/MTN : `message` = **code USSD à afficher** (ex. `#144*82#`).
   - Carte : `link` = page de checkout Bictorys (**mode CHECKOUT uniquement** —
     aucune saisie de carte dans l'app, pas de PCI-DSS à notre charge).
3. **Ne pas sonder `/status` en boucle** : le webhook est la source de vérité.
   La confirmation vient du webhook (`authorize-guest` est déclenché serveur).
4. **Idempotence** : envoyer un `idempotencyKey` (UUID) par tentative ; un rejeu
   renvoie `{ ..., replayed: true }` sans double charge. Ne pas utiliser le
   préfixe `pc-` (réservé serveur).
5. **Échec provider** : 502 (réessayer) ou 503 (configuration invalide). La
   transaction reste `pending` et peut être résolue par webhook.
6. ⚠️ **`create-wave-payment` / `create-om-payment` sont dépréciés** mais
   conservent leur contrat historique (`checkoutUrl` / `paymentUrl`) le temps de
   la migration. Ils ne simulent plus un succès quand le provider n'est pas
   configuré : la transaction reste pending, l'accès n'est pas débloqué.

## 9. Secrets à définir (s'ajoutent à §4)

| Secret | Rôle | Remarque |
|---|---|---|
| `BICTORYS_API_URL` | URL base | Sandbox `https://api.test.bictorys.com` / prod `https://api.bictorys.com`. Si absent : déduit de la clé (`test_*` → sandbox). |
| `BICTORYS_API_KEY` | Clé PUBLIQUE (charges + status) | Sandbox : `test_public-...`. **Pas de saisie carte** (mode checkout). |
| `BICTORYS_WEBHOOK_SECRET` | Secret DÉDIÉ du webhook | **Pas la private key.** Sans lui → 503. Webhooks test ET prod séparés. |
| `BICTORYS_PRIVATE_KEY` | Payouts | JAMAIS lu par les fonctions de charge. Ne jamais exposer au front. |
| `BICTORYS_MERCHANT_SECRET_CODE` | Payouts | Idem. |
| `PAYMENT_PROVIDER` | Provider global | Défaut `bictorys`. Surcharge par site via `sites.payment_provider`. |

`.env.local` (gitignoré) : ces noms exacts. Le CLI Supabase local (`supabase
functions serve`) lit `.env.local` automatiquement pour les Edge Functions
(tests locaux). Pour le live : `npx supabase secrets set ...` (jamais fait ici).

## 10. Reste à faire (hors cette tranche)

1. Déploiement : `supabase migration repair` (28 entrées) puis `db pull`,
   `db push` de toutes les migrations, redéploiement des fonctions, définition
   des secrets (§4 + §9).
2. **REPORTÉ de §7 original** (non démarré — priorité Bictorys) :
   - Script admin one-shot de re-chiffrement des mots de passe UniFi legacy
     (`enc:gcm:<iv>:<ct>` via `_shared/crypto.ts`) ;
   - Migration OTP hashés (SHA-256, table dédiée hors `pc_audit_logs`) +
     UNIQUE (site_id, phone/email) sur `wifi_users` ;
   - Tables `family_profiles` / `family_members` (module famille en mock) ;
   - Bucket Storage `site-assets` + policies (`sites/<id>/`, logo public) ;
   - Nettoyage policies RLS dupliquées : transactions (9), chat_messages (9),
     events (5) ;
   - Tests pgTAP sur `is_admin_user()` / `can_access_site()` / `is_viewer()`.
3. Qualification des 29 tables vides en revue produit.
4. Suppression de la colonne `loyalty_points` après refonte front.
5. Contrat org/memberships complet (invitations, rôles par org) + tarif WaaS —
   après validation produit.
6. Implémentation réelle de l'API Orange Money v2 SN (provider `orange`) — en
   attendant, OM passe par Bictorys.

## 11. Mutations live effectuées par cet agent

**Aucune.** Aucune requête d'écriture SQL, aucun db push/pull, aucun secrets set,
aucun redéploiement de fonction, aucun migration repair. Lecture seule
(`migrations_schema_dump.sql` = snapshot existant). Aucun commit/push/branche —
tout est dans le working tree.
