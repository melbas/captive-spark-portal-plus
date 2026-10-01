-- ===========================================================================
-- UniFi : mode Cloud Connector (api.ui.com + X-API-Key)
-- ===========================================================================
-- Avant : hardware_integrations ne supportait que le mode "console locale"
-- (controller_url + username + password, login cookie/CSRF). Inutilisable
-- depuis un portail hébergé (Vercel) : exige port-forward/VPN vers le LAN
-- du client.
-- Après : le mode "cloud_connector" joint la console via api.ui.com — la
-- console n'a besoin que d'une sortie Internet (Remote Management, TCP 443
-- + 8883 sortants). Aucun port ouvert, aucun tunnel.
--
-- L'ancien mode est CONSERVÉ (même règle que Wave/Bictorys) : on ajoute, on
-- ne supprime pas. Un site existant reste sur son mode actuel jusqu'à ce
-- que l'opérateur bascule explicitement.
--
-- Sécurité : la clé API est stockée CHIFFRÉE (AES-256-GCM via
-- _shared/crypto.ts + ENCRYPTION_KEY), jamais en clair. Même traitement que
-- l'ancien api_password_enc.
-- ===========================================================================

BEGIN;

-- 1. Nouvelles colonnes ------------------------------------------------------
ALTER TABLE public.hardware_integrations
  ADD COLUMN IF NOT EXISTS connection_mode TEXT NOT NULL DEFAULT 'local'
    CHECK (connection_mode IN ('cloud_connector', 'local'));

-- console_id : ID de la console UniFi (récupérable via GET /v1/hosts avec la
-- clé API, ou lu dans l'URL unifi.ui.com/consoles/<id>/...).
ALTER TABLE public.hardware_integrations
  ADD COLUMN IF NOT EXISTS console_id TEXT;

-- Clé API UI chiffrée (format "enc:gcm:<iv>:<ciphertext>" — voir crypto.ts).
ALTER TABLE public.hardware_integrations
  ADD COLUMN IF NOT EXISTS api_key_enc TEXT;

-- 2. Assouplir les contraintes du mode legacy --------------------------------
-- controller_url était NOT NULL : en mode cloud_connector la base est
-- api.ui.com, l'URL de la console n'est plus requise.
ALTER TABLE public.hardware_integrations
  ALTER COLUMN controller_url DROP NOT NULL;

-- 3. Une seule intégration active par site -----------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS hardware_integrations_site_active_idx
  ON public.hardware_integrations (site_id)
  WHERE is_active = true;

COMMIT;
