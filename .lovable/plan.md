
# Plan — Débloquer les tests (OTP DEV + accès back-office)

Objectif : vous permettre de re-tester le parcours portail captif **sans SMS réel** et confirmer que le back-office est accessible. Aucune modif sur la sécurité prod (les checks RLS/JWT restent comme avant).

---

## 1. OTP en mode DEV (portail captif)

Problème : `send-otp` génère un code mais ne l'envoie nulle part (pas de provider SMS configuré) → impossible de finir le parcours de test.

Correctif minimal :

**Edge Function `send-otp`** (`supabase/functions/send-otp/index.ts`)
- Ajouter un flag `DEV_OTP_MODE` (variable d'env, par défaut `true` tant que `SMS_API_KEY` est absent).
- Quand actif : retourner le `code` généré dans la réponse JSON (`{ success: true, devCode: "123456", expiresIn: 300 }`) en plus du log console.
- Forcer le code à `123456` pour simplifier les tests répétés (configurable via env `DEV_OTP_FIXED_CODE`).
- Le stockage en base et la vérification via `verify-otp` restent identiques → aucun changement de logique.

**UI `PortalAuth.tsx`**
- Si la réponse contient `devCode`, afficher un toast persistant + un petit encart jaune sous le champ OTP : « Mode test — Code : 123456 ».
- Pré-remplir automatiquement le champ OTP avec le `devCode` reçu pour cliquer directement sur « Vérifier ».

**Avantage** : zéro setup SMS, parcours testable en 10 secondes, et basculement prod = simplement définir `DEV_OTP_MODE=false` + ajouter `SMS_API_KEY`.

---

## 2. Vérification accès back-office

État constaté en base :
- ✅ Compte admin existe : `melbascompts@gmail.com` avec rôle `admin` dans `user_roles`.
- ✅ Routes en place : `/admin/login` → `AdminLogin.tsx` → redirige vers `/admin/dashboard` si `isAdmin`.
- ✅ Hook `useAdminAuth` lit bien `user_roles` avec `.eq('role','admin').maybeSingle()`.
- ⚠️ Le compte `melo@wifisn.com` n'a **pas** de rôle → s'il essaie de se connecter, il verra le message « accès refusé ».

Actions :
1. Confirmer avec vous le mot de passe de `melbascompts@gmail.com`. Si oublié → je le réinitialise via migration (admin API) ou je crée un nouveau compte de test `admin@test.local` / `Admin123!`.
2. Optionnel : promouvoir `melo@wifisn.com` au rôle `admin` (insertion dans `user_roles`).
3. Ajouter un message d'erreur plus clair sur `AdminLogin.tsx` quand l'utilisateur existe mais n'est pas admin (déjà partiellement présent ligne 66, je le rends plus visible).

---

## 3. Hors scope (volontairement)

- Pas de touche aux RLS sensibles, ni à `verify_jwt` des Edge Functions, ni au flux Wave.
- Pas de SMS réel pour l'instant.
- Pas de modification du parcours voucher / paiement.

---

## Détails techniques

| Fichier | Changement |
|---|---|
| `supabase/functions/send-otp/index.ts` | Ajout mode DEV, retour `devCode` |
| `src/components/portal/PortalAuth.tsx` | Affichage code dev + auto-fill |
| `src/pages/admin/AdminLogin.tsx` | Message d'erreur « non admin » plus visible |
| `supabase/migrations/...` (optionnel) | Promouvoir `melo@wifisn.com` admin si vous le confirmez |

## Questions avant exécution

1. **Compte admin** : vous utilisez bien `melbascompts@gmail.com` ? Mot de passe connu, ou je crée un compte de test dédié ?
2. **OTP fixe** : OK pour `123456` comme code universel en DEV, ou vous préférez un code aléatoire affiché à l'écran ?
3. **Email Wolof/EN** : on garde l'onglet email dans le même mode DEV ? (oui par défaut)

Dès que vous validez (et répondez aux 3 questions), je passe en mode build et j'applique les changements.
