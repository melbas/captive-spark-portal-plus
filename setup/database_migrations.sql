
-- Création d'une énumération pour les rôles utilisateur
CREATE TYPE public.user_role AS ENUM ('owner', 'member', 'individual');

-- Ajout de colonnes à la table wifi_users pour la gestion familiale
ALTER TABLE public.wifi_users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'individual'::user_role,
ADD COLUMN IF NOT EXISTS family_id uuid,
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Création de la table pour les profils familiaux
CREATE TABLE IF NOT EXISTS public.family_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES public.wifi_users(id) ON DELETE CASCADE,
  owner_name text,
  owner_email text,
  owner_phone text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  member_count integer DEFAULT 1,
  max_members integer DEFAULT 5,
  active boolean DEFAULT true
);

-- Création de la fonction pour décrémenter le compteur de membres
CREATE OR REPLACE FUNCTION public.decrement_counter(row_id uuid)
RETURNS integer AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT member_count INTO current_count FROM public.family_profiles WHERE id = row_id;
  IF current_count > 0 THEN
    RETURN current_count - 1;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Création de la table pour les clients RADIUS
CREATE TABLE IF NOT EXISTS public.radius_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shortname text NOT NULL,
  nastype text NOT NULL,
  secret text NOT NULL,
  ip_address text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Création de la table pour les journaux d'authentification RADIUS
CREATE TABLE IF NOT EXISTS public.radius_auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  nasipaddress text NOT NULL,
  nasportid text,
  auth_date timestamp with time zone DEFAULT now(),
  auth_status text NOT NULL CHECK (auth_status IN ('accept', 'reject')),
  failure_reason text
);

-- Création de la table pour les journaux de comptabilité RADIUS
CREATE TABLE IF NOT EXISTS public.radius_accounting_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  acct_session_id text NOT NULL,
  acct_session_time integer,
  acct_input_octets bigint DEFAULT 0,
  acct_output_octets bigint DEFAULT 0,
  nasipaddress text NOT NULL,
  start_time timestamp with time zone DEFAULT now(),
  stop_time timestamp with time zone,
  termination_cause text
);

-- Création de Row-Level Security pour les tables
ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;

-- Politique pour les profils familiaux - seul le propriétaire peut voir son profil familial
CREATE POLICY "Owner can see their family profile" ON public.family_profiles
  FOR SELECT
  USING (owner_id = auth.uid());
  
-- Politique pour les profils familiaux - seul le propriétaire peut modifier son profil familial
CREATE POLICY "Owner can update their family profile" ON public.family_profiles
  FOR UPDATE
  USING (owner_id = auth.uid());
