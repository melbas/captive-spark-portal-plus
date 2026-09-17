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

## 7. Reste à faire (hors lot initial)

1. Déploiement : `supabase migration repair` (28 entrées) puis `db pull`,
   `db push` des 3 migrations, redéploiement des 8 fonctions (sauf
   wave-webhook en verify_jwt=false), définition des 4 secrets (§4).
2. Re-chiffrer les mots de passe UniFi legacy (script admin one-shot).
3. Durcir `create-wave-payment` / `create-om-payment` (identité de l'appelant,
   MAC lu du contexte serveur, succès/erreur URLs propres).
4. Qualification des 29 tables vides en revue produit (schéma archive).
5. Nettoyage des policies dupliquées restantes (transactions, chat_messages,
   events).
6. Suppression de la colonne `loyalty_points` après refonte front.
7. Tests pgTAP sur is_admin_user/can_access_site + e2e du parcours démo
   post-policies.
8. OTP hashés (SHA-256) + table dédiée (sortir de pc_audit_logs) ; UNIQUE
   (site_id, phone/email) sur wifi_users.
9. Tables `family_profiles`/`family_members` OU masquage du module famille.
10. Contrat org/memberships complet (invitations, rôles par org) + tarif
    WaaS — après validation produit.

## 8. Mutations live effectuées par cet agent

**Aucune.** Aucune requête d'écriture SQL, aucun db push/pull (dump = lecture
seule), aucun secrets set, aucun redéploiement de fonction, aucun migration
repair. Aucun identifiant de mutation à signaler.
