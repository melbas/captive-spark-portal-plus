# Checklist P0 sécurité — validation avant déploiement

> Plan : `docs/superpowers/plans/2026-09-28-portail-captif-redesign.md` — Tâche 24.
> Chaque item a été vérifié par grep / lecture du code réel (branche `dev`),
> pas par le plan. Les commandes de vérification sont listées en fin de doc.

---

## OTP

- [x] **Code OTP de test `123456` supprimé du code actif.**
  `verify-otp/index.ts` : le bypass démo est conditionné aux secrets
  `DEV_OTP_MODE=true` + `DEV_OTP_FIXED_CODE` (plus aucune valeur en dur) ;
  `authorize-guest` refuse le matériel UniFi réel pour une session `demo:true`.
  Aucun `=== '123456'` dans le code suivi par git. ⚠️ Des fichiers de backup
  **non suivis** (`.bak*`, `.backup*`, `.new`, `.refactor`, `.before_fix`)
  contiennent encore `DEV_OTP_CODE = '123456'` sur le disque — les supprimer
  avant prod pour éviter toute résurgence (`src/components/AuthBox.tsx.*`,
  `supabase/functions/send-otp/index.ts.bak*`).

- [x] **Rate limiting `otp_attempts` en place.**
  Migration `2026-09-28-001_create_otp_attempts.sql` (table + index).
  `send-otp` : 3 envois/h/identifiant, 10/jour/IP via `otp_send_rate_limits` → 429.
  `verify-otp` : 10 tentatives/h/identifiant+IP via `otp_attempts` → 429.
  (La fonction SQL `check_otp_limit` du plan n'existe pas telle quelle ; la
  logique équivalente est implémentée directement dans les Edge Functions.)

## Webhooks paiement

- [x] **HMAC fail-closed sur les webhooks de paiement.**
  `wave-webhook/index.ts` : secret absent → **503 sans traitement** ; signature
  HMAC-SHA256 sur le corps brut, comparaison à temps constant → 401.
  `bictorys-webhook/index.ts` : même schéma fail-closed (503 sans secret) +
  `verifyWebhookSignature` avec anti-replay (`X-Webhook-Timestamp`).
  Note : pas de `om-webhook` séparé — Orange Money est routé via Bictorys
  (`_shared/payment/providers/orange.ts`), donc couvert.

## Edge Functions

- [x] **JWT obligatoire (`requireAuth`) sur les Edge Functions sensibles.**
  Vérifié présent dans : `verify-otp`, `send-otp`, `wave-webhook`,
  `bictorys-webhook`, `authorize-guest`, `create-charge`, `create-wave-payment`,
  `create-om-payment`, `revoke-session`, `track-event`,
  `test-hardware-connection` (`_shared/auth.ts` avec helpers de rôle).

## Secrets

- [x] **Secret UniFi chiffré via pgcrypto.**
  Migration `2026-09-28-002_encrypt_unifi_secret.sql` : colonne
  `secret_encrypted bytea` + `decrypt_unifi_secret()` (pgp_sym_decrypt avec
  `app.unifi_secret`). `supabase/functions/_shared/unifi.ts` déchiffre via la
  fonction SQL — plus de secret en clair côté client.

## Isolation multi-tenant

- [x] **RLS multi-tenant activée.**
  Migration `2026-09-28-003_rls_policies.sql` : RLS + policies scopées sur
  `sites`, `resellers`, `hardware_integrations`, `wifi_users`, `wifi_sessions`,
  `transactions`, `vouchers`, `wifi_plans` (select/insert/update/delete selon
  rôle, helpers `is_admin_user` / `can_access_site`).

- [x] **Tables inutilisées archivées.**
  Migration `2026-09-28-004_archive_unused_tables.sql` : schéma `archive`,
  15 tables déplacées hors `public`.
  ⚠️ La migration `2026-09-28-005_restore_quiz_games_rewards.sql` (restauration
  de `quizzes`/`games`/`rewards` scopées par site) **n'est pas encore appliquée
  en prod** — à appliquer avant la mise en prod des modules quiz/jeux/récompenses.

## Réseau

- [x] **Walled garden documenté.**
  `supabase/metadata/walled_garden.md` (commit `df593be`) : liste des domaines
  pré-auth vérifiés dans le code (Vercel, `*.supabase.co`, Bictorys, Wave,
  CDN de démo) + notes pour l'admin réseau.
- [ ] **HTTPS du portail captif testé sur le réseau réel.**
  Le walled garden est documenté mais le parcours réel (redirection captive →
  HTTPS portail pré-auth) n'a pas été testé sur un SSID UniFi avec walled
  garden actif. À faire en recette réseau (tâche 19, volet configuration UniFi).

## CI / qualité

- [ ] **CI verte (build + tsc + lint + e2e).**
  Le workflow `.github/workflows/ci.yml` existe (build, `tsc --noEmit`, lint,
  build, e2e Playwright local) mais **le lint échoue en local** :
  `npm run lint` → **107 problèmes (91 erreurs)**, dont des imports `require()`
  interdits. `npx tsc --noEmit` passe. La CI ne peut donc pas être verte en
  l'état — corriger les erreurs de lint avant déploiement.
  (Vérification des runs GitHub impossible ici : `gh` non authentifié.)

## Valeurs en dur

- [ ] **Valeurs en dur éliminées du portail.**
  Grep `sample-videos` / `SoundHelix` : plus aucune occurrence dans
  `WifiPortalContainer` ou les modules du portail riche, **mais** les URLs de
  démo subsistent comme défauts dans `src/lib/portal-config-defaults.ts`
  (vidéo `sample-videos.com/big_buck_bunny…`, audio `soundhelix.com`), utilisés
  par `WifiPortalContainer` via `usePortalConfig`. Les données mock famille
  (`mock-family-members.ts`, ids `fam-123456`/`usr-123456`) sont aussi toujours
  présentes. À supprimer/remplacer par des données Supabase avant prod.
  Les occurrences `123456` restantes dans le code suivi sont bénignes
  (exemples de numéros de téléphone, ids mock), pas des codes OTP.

---

## État au 2026-09-28

Vérifications effectuées sur la branche `dev` (HEAD `df593be`), par grep et
lecture directe du code :

```bash
# OTP 123456 — aucune occurrence dans le code suivi actif
grep -rn "123456" src/ supabase/functions/
# → hits uniquement dans : fichiers .bak/.backup non suivis, ids mock
#   (fam-123456/usr-123456), exemples de téléphone. Pas de code OTP en dur.

# Valeurs en dur média
grep -rni "sample-videos" src/ supabase/functions/   # → portal-config-defaults.ts (2)
grep -rni "soundhelix"    src/ supabase/functions/   # → portal-config-defaults.ts (2)

# Rate limiting
grep -rn "otp_attempts" supabase/migrations/ supabase/functions/   # → migration 001 + 2 fonctions
grep -n "otp_send_rate_limits" supabase/functions/send-otp/index.ts

# HMAC fail-closed
grep -rni "hmac\|fail.closed" supabase/functions/wave-webhook/ \
  supabase/functions/bictorys-webhook/

# JWT
grep -rln "requireAuth" supabase/functions/   # → 12 fonctions dont les 4 sensibles

# pgcrypto
grep -rni "pgcrypto\|secret_encrypted\|decrypt_unifi_secret" \
  supabase/migrations/ supabase/functions/

# RLS / archive
grep -n "ROW LEVEL SECURITY\|CREATE POLICY" supabase/migrations/2026-09-28-003_rls_policies.sql
grep -ni "set schema archive" supabase/migrations/2026-09-28-004_archive_unused_tables.sql

# Walled garden
ls supabase/metadata/walled_garden.md

# CI
npx tsc --noEmit   # → 0 erreur
npm run lint       # → 107 problèmes (91 erreurs) ⇒ CI non verte
```

**Synthèse : 8 items sur 10 cochés. Restent ouverts avant déploiement :**
1. Corriger les 91 erreurs de lint pour rendre la CI verte.
2. Éliminer les valeurs de démo en dur (`portal-config-defaults.ts`,
   mocks famille) au profit de la config Supabase.
3. Tester le portail captif HTTPS sur un réseau UniFi réel avec walled garden.
4. Appliquer la migration 005 (restauration quiz/games/rewards) en prod.
5. Régénérer les types Supabase (`supabase gen types`) après les migrations 001–005.
6. Purger les fichiers de backup non suivis contenant `DEV_OTP_CODE = '123456'`.
