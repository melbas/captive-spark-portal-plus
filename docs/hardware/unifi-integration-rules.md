# UniFi Integration — normes d'implémentation

> Source normative : `API-REFERENCE-unifi-network-UDM-20260922.pdf` (tests réels UDM Pro Max NVR00, UniFi OS 10.5.67 / Network 10.6.101, par AdMel/Abdoulaye).
> Ce document fixe les règles que l'adapter `provision-access` DOIT suivre. En cas de conflit avec la doc officielle Ubiquiti, ce document gagne.

## Authentification

1. **Méthode prioritaire : `X-API-Key` header** sur base `/proxy/network/` (local) — lecture + écriture, créée dans Settings → Control Plane → API. Stockée côté serveur uniquement, jamais en front.
2. Fallback legacy : session admin `POST /api/auth/login` + cookie + `x-csrf-token` sur les POST (mode local historique).
3. Cloud Connector (api.ui.com) : mode existant dans `_shared/unifi.ts`, conservé pour les sites sans accès local.
4. Le token console `/api/access` ne passe PAS sur `/proxy/network` (401 vérifié) — ne jamais l'utiliser.

## Provisionnement d'un client WiFi (flux complet d'un plan)

Un plan `wifi_plans` = 3 actions dans l'ordre :

1. **Autorisation temporelle** : `cmd/stamgr {"cmd":"authorize-sta","mac":"...","minutes":N}` (N vient de `duration_minutes`, jamais du navigateur).
2. **Débit (QoS)** : `PUT rest/user/{id}` avec `usergroup_id` du groupe correspondant au plan. Groupes créés/gérés via `rest/usergroup`.
   - `qos_rate_max_up/down` en **Mbps**, plage **2 → 100 000**, `-1` = illimité.
   - **⚠️ 1 Mbps est rejeté** par le pattern API (`-1|[2-9]|[1-9][0-9]{1,4}|100000`). Mapper tout `<= 1` vers 2.
3. **Blocage (admin)** : `PUT rest/user/{id} {"blocked": true}` — utilisé par la page admin, pas par le flux visiteur.

Révocation : `cmd/stamgr {"cmd":"disconnect-sta","mac":"..."}` ou `cmd/sitemgr {"cmd":"kick-sta"}` (POST obligatoire, GET = 404).

## Quotas data

- `data_limit_mb` (wifi_plans) est appliqué **par orchestration externe** : l'UDM n'a AUCUNE règle native déclenchée par volume (limite 10.6.101 confirmée §8).
- Mécanisme : lecture périodique `stat/sta` (champs `rx_bytes`/`tx_bytes` cumulés par MAC) → comparaison au quota → action (disconnect ou bascule usergroup bridé).
- Historique par client : `stat/report/daily.user` (octets par MAC par jour). `stat/report/hourly.user` = identités SANS octets (limite confirmée).

## Filtrage applicatif (différenciation produit)

- Policy Engine v2 : `POST/GET/DELETE /v2/api/site/{site}/firewall-policies` (pluriel + trait d'union ; le singulier `firewallpolicy` = 404).
- Catalogue DPI : 2 131 apps `cat,app` (ex. YouTube 4,112 · TikTok 4,248 · WhatsApp 0,41 · Netflix 4,132). Catalogue complet exporté côté UDM : `bwdpi.app.db`.
- Contraintes de validation découvertes (à respecter dans le code) :
  - `schedule` OBLIGATOIRE sur tout POST (sinon 400 NotNull.schedule) → toujours `{"mode":"ALWAYS","repeat_on_days":[],"time_all_day":false}`.
  - `create_allow_respond: false` obligatoire sur un POST BLOCK (sinon 400).
  - Payload minimal valide : voir §3.1 du PDF source.
- Usage portail : forfait gratuit peut bloquer les catégories streaming (cat 4), premium autorise tout. Config dans `module_config` du précepte paiement.

## Pièges à ne pas reproduire (retours d'expérience réels)

| Erreur | Cause | Règle |
|---|---|---|
| 401 sur /proxy/network | token console utilisé | X-API-Key ou session+csrf |
| 400 NotNull.schedule | POST firewall sans schedule | toujours inclure schedule |
| 400 RespondTrafficPolicyNotAllowed | create_allow_respond:true sur BLOCK | false au POST |
| 400 InvalidPayload qos | 1 Mbps | min 2, ou -1 |
| 404 firewallpolicy | singulier | pluriel `firewall-policies` |
| 405 traffic-flows | GET | POST uniquement |
| zone-matrix capricieux | 2e appel retourne HTML | 1 lecture par session, cacher le résultat |

## Sécurité

- Toute écriture (POST/PUT/DELETE/cmd/blocked/usergroup) = catégorie CHANGE côté opérateur : backup avant (`GET firewall-policies` dump), rollback documenté, un go = un palier.
- Cible de test : IP de lab uniquement, jamais les VLANs clients.
- Aucun secret dans ce repo — clés dans le vault / variables d'environnement Supabase.
- ⚠️ `rest/setting` expose le mot de passe SMTP en clair (`x_password`) — ne jamais journaliser la réponse.

## Statut de test des commandes utilisées par l'adapter

| Commande | Usage portail | Testée |
|---|---|---|
| `stat/sta` | quotas, présence | ✅ |
| `rest/usergroup` GET | mapping plans→groupes | ✅ |
| `rest/usergroup` POST/DELETE | créer groupes par forfait | ✅ (lab) |
| `PUT rest/user/{id}` (usergroup) | appliquer le débit du plan | ⚠️ modèle connu, à tester sur site |
| `PUT rest/user/{id}` (blocked) | blocage admin | ⚠️ à tester |
| `cmd/stamgr authorize-sta` | autorisation temporelle | ⚠️ à tester (mode local) |
| `cmd/stamgr disconnect-sta` | fin de session / quota | ⚠️ à tester |
| `POST firewall-policies` (v2) | filtrage app par forfait | ✅ 201 (rollbacké) |
| `POST traffic-flows` | analytics domaines | ✅ |
| `stat/report/daily.user` | usage mensuel client | ✅ |

> Les lignes ⚠️ constituent le plan de test terrain P0-B (contrôleur UDM d'Abdoulaye, 192.168.11.1).
