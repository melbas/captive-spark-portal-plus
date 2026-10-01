# Walled Garden — Domaines autorisés avant authentification (UniFi)

> **À qui c'est destiné :** administrateur réseau UniFi. Cette liste définit les
> domaines à autoriser dans le **walled garden pré-authentification** du portail
> captif, pour que le portail et le flux de paiement fonctionnent AVANT que le
> client ne soit authentifié sur le réseau.
>
> **Source de vérité :** domaine par domaine, chaque entrée ci-dessous a été
> vérifiée dans le code (`src/`, `supabase/functions/`) — branche `dev`.

---

## 1. Liste à configurer dans le walled garden UniFi

### Portail lui-même (front-end Vercel)

| Domaine | Pourquoi |
|---|---|
| `captive-spark-portal-plus.vercel.app` | Le portail captive est hébergé sur Vercel (SPA). C'est la première page que le client doit charger pour s'inscrire / payer. |

### Supabase (auth, API REST, Edge Functions, storage)

| Domaine | Pourquoi |
|---|---|
| `*.supabase.co` | Regroupe Auth (OTP SMS, sessions), PostgREST, Storage (logos, pubs) et les Edge Functions (`/functions/v1/create-charge`, `send-otp`, `verify-otp`, `authorize-guest`, webhooks de paiement). Sans ce wildcard, aucun flux d'inscription ni de paiement ne fonctionne. |
| `pvplhqzzhmqseyzooags.supabase.co` | Instance projet réelle (déjà couverte par `*.supabase.co`, liste explicite à titre de référence). |

### API de paiement (appelées pendant le parcours client pré-auth)

| Domaine | Pourquoi |
|---|---|
| `api.bictorys.com` | Provider de paiement **principal** (décision produit 2026-09-17). Création de charge, et page de paiement hébergée Bictorys vers laquelle le client est redirigé. Retour via la Edge Function `bictorys-redirect`. |
| `api.test.bictorys.com` | Sandbox Bictorys (`BICTORYS_ENV=test`). Autoriser si un environnement de test est utilisé sur le réseau de recette. |
| `api.wave.com` | Provider Wave direct (`wave_money`) — `POST /v1/checkout/sessions` depuis `create-wave-payment` / `create-charge`. Le client confirme le paiement via l'app/ USSD Wave ; l'accès API garantit le retour de session. |

> **Orange Money direct :** aucune API Orange Money directe n'est appelée par le
> code (l'intégration `orange` renvoie explicitement vers Bictorys pour le
> `orange_money`, voir `supabase/functions/_shared/payment/providers/orange.ts`).
> **Aucun domaine Orange à ajouter aujourd'hui.** Si l'API v2 Orange Sénégal est
> implémentée plus tard, ajouter son domaine ici.

### CDN / médias utilisés par le portail

| Domaine | Pourquoi |
|---|---|
| `images.unsplash.com` | Images de démonstration par défaut (slides pub, logos) dans `src/lib/portal-config-defaults.ts`. Nécessaire pour que le portail de démo s'affiche sans images cassées pré-auth. |
| `sample-videos.com` | Vidéo pub de démo (`big_buck_bunny_720p_1mb.mp4`) par défaut. Peut être retiré si les vidéos de prod sont servies depuis Supabase Storage. |
| `www.soundhelix.com` | Audio de démonstration par défaut (bande-son portail). Idem remarque vidéo. |

---

## 2. Notes pour l'admin réseau

1. **Webhooks entrants (Bictorys → Supabase)** : ils partent du provider vers
   `*.supabase.co` côté cloud, **pas** depuis le client Wi-Fi. Rien à ajouter
   pour eux dans le walled garden.
2. **`api.ui.com` (UniFi Cloud API)** : appelée uniquement côté serveur
   (Edge Functions → contrôleur), jamais par le navigateur du client. Ne pas
   mettre dans le walled garden.
3. **SMS (`your-sms-api.com`)** : appel commenté dans le code
   (`src/services/wifi/sms-service.ts`), non actif. À ajouter uniquement si un
   provider SMS externe côté client est un jour branché (aujourd'hui les OTP
   passent par Supabase).
4. **Sites configurés en back office** : les URLs de pubs/vidéos/audios réelles
   proviennent des tables `ad_videos` / config portail (Supabase Storage =
   `*.supabase.co`, déjà couvert). Si un site utilise un CDN média externe
   personnalisé, ajouter son domaine au walled garden et mettre à jour ce doc.
5. **Redirection post-paiement** : après paiement, le client est renvoyé vers
   `pvplhqzzhmqseyzooags.supabase.co/functions/v1/bictorys-redirect` puis vers
   le portail Vercel — les deux sont déjà couverts ci-dessus.

---

## 3. Résumé de la liste brute (copier-coller UniFi)

```text
captive-spark-portal-plus.vercel.app
*.supabase.co
api.bictorys.com
api.test.bictorys.com
api.wave.com
images.unsplash.com
sample-videos.com
www.soundhelix.com
```
