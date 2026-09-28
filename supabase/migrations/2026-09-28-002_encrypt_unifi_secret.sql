-- Add column for encrypted UniFi secret if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unifi' AND column_name = 'secret_encrypted') THEN
        ALTER TABLE public.unifi ADD COLUMN secret_encrypted bytea;
    END IF;
END $$;

-- Create or replace decrypt function
CREATE OR REPLACE FUNCTION public.decrypt_unifi_secret(encrypted bytea)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT pgp_sym_decrypt(encrypted, current_setting('app.unifi_secret'));
$$;