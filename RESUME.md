# captive-spark-portal-plus — État & Reprise

> **Reprise en 3 commandes :**
> ```bash
> cd ~/projects/captive-spark-portal-plus
> npm run dev          # serveur sur :5173 (testé OK, HTTP 200)
> npx supabase functions serve   # quand le projet Supabase sera réactivé
> ```

## 1. Ce que c'est
Portail captif WiFi monétisé (OTP SMS, paiements Wave/Orange Money, admin multi-sites, profils famille).
Stack : React 18 + Vite + TS + Tailwind + shadcn/ui — backend Supabase (DB + 8 Edge Functions).
Généré via Lovable. Repo : https://github.com/melbas/captive-spark-portal-plus (public).
~22 000 lignes TS/TSX, 193 fichiers.

## 2. Environnement machine (déjà prêt, vérifié)
- Node 26 / npm 11 — Vite 5 OK
- Git : identité `Abdoulaye <melbas@users.noreply.github.com>`, credentials GitHub en `~/.git-credentials` (chmod 600)
- Supabase CLI 2.117.0, Docker 29.7.1 (Supabase local possible)
- `SUPABASE_ACCESS_TOKEN` persisté dans `~/.bashrc` (fonctionne, vérifié via `supabase projects list`)

## 3. État du projet (audit du 2026-09-16, session 2)
- ✅ Supabase `portail_captif` restauré (ACTIVE_HEALTHY) via API Management + SQL direct (`/database/query`)
- ✅ Site démo seedé : `sites` slug `demo` + 3 forfaits (0/500/1500 FCFA)
- ✅ Déploiement Vercel : https://captive-spark-portal-plus.vercel.app — 404 SPA corrigé par `vercel.json` (rewrites → /index.html), poussé sur main
- ✅ **Parcours client complet testé et fonctionnel** (Playwright) : welcome → OTP (code 123456 en dev) → forfaits → paiement Wave/OM → "Accès accordé" + timer
- ✅ Bugs corrigés & déployés (commit f43de23 sur main) :
  1. `verify-otp` : `wifi_users.auth_method` NOT NULL non renseigné → ajouté
  2. `create-wave-payment` / `create-om-payment` : `transactions.amount` NOT NULL non renseigné → ajouté
- ⚠️ La table `sites` était vide (aucun site configuré) — d'où le portail vide
- ⚠️ Code OTP 123456 universel en dev : `DEV_OTP_MODE`/`SMS_API_KEY` à définir avant prod
- ✅ `npm install` OK — `tsc --noEmit` 0 erreur — `npm run build` OK (40s, bundle 1,2 Mo / 347 kB gzip)
- ✅ `.env` présent et complet (Supabase URL + clés SET)
- ✅ Branche `dev` créée (commit `bf68ac1` : ajout `.env.example`)
- ⚠️ **BLOQUEUR SUPABASE** : le projet `portail_captif` (`pvplhqzzhmqseyzooags`, eu-west-3, PG15) est **en pause** sur Supabase.
  → **Action humaine requise** : Restore sur https://supabase.com/dashboard/project/pvplhqzzhmqseyzooags
  → Puis ici : `supabase link --project-ref pvplhqzzhmqseyzooags` puis `supabase db pull` pour comparer schéma distant vs migrations locales (4 migrations dans `supabase/migrations/`)
- ⚠️ Token GitHub donné en clair dans le chat → **à révoquer** après la session (github.com/settings/tokens)

## 4. Chantiers identifiés (par priorité)
1. **Retirer le code de test OTP** — dernier commit « Accepté le code 123456 » : le flux OTP accepte un code universel en prod. Chercher `123456` dans `src/` et les fonctions `send-otp`/`verify-otp`.
2. **Brancher la partie famille sur Supabase** — actuellement en mock (`src/services/wifi/family/data/mock-family-members.ts`, utilisé dans `Index.tsx`, `useWifiPortal`, dashboards admin).
3. **Réparer le lint** — 83 problèmes (68 erreurs, dont `require()` interdits). `npm run lint`.
4. **Code-splitting** — chunk de 1,2 Mo ; activer les dynamic imports sur les pages admin.
5. Optionnel : CI GitHub Actions (build + lint), nettoyage historique « Changes ».

## 5. Pages clés (pour naviguer vite)
- Portail public : `src/pages/Portal.tsx` — composants `src/components/wifi-portal/`
- Admin : `src/pages/admin/` (11 pages : Dashboard, Sessions, Vouchers, Resellers, Transactions, Users, Sites, Settings, Logs, Analytics, Login)
- Edge Functions : `supabase/functions/` (send-otp, verify-otp, authorize-guest, revoke-session, create-wave-payment, create-om-payment, wave-webhook, test-hardware-connection)
- Client Supabase : `src/integrations/supabase/client.ts` (URL hardcodée — repo public, à surveiller)

## 6. Projet Supabase lié
| Projet | Ref | Statut |
|---|---|---|
| portail_captif | `pvplhqzzhmqseyzooags` | ⏸ PAUSED — à restaurer |
| autres | hermes, tapin, wifi-client-manager, Wi-Fi Survey, Logs, new portail | actifs/inactifs |

## 7. Rappels sécurité
- Ne jamais committer `.env` (ignoré par git — OK)
- Clé Supabase `publishable` hardcodée dans `client.ts` : acceptable, mais l'URL projet est exposée (repo public)
- Tokens en clair dans le chat : GitHub **et** Supabase access token → à révoquer/renouveler en fin de session
