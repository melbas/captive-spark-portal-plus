-- Migration 002 fix : la table réelle est hardware_integrations (pas "unifi",
-- qui n'existe nulle part dans les migrations). Colonne secret_encrypted bytea
-- + fonction decrypt_unifi_secret via pgcrypto (Task 5 du plan redesign).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hardware_integrations' AND column_name = 'secret_encrypted') THEN
        ALTER TABLE public.hardware_integrations ADD COLUMN secret_encrypted bytea;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.decrypt_unifi_secret(encrypted bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT pgp_sym_decrypt(encrypted, current_setting('app.unifi_secret'));
$$;

REVOKE ALL ON FUNCTION public.decrypt_unifi_secret(bytea) FROM anon, authenticated;
