
-- Create RPC function to create a family profile
CREATE OR REPLACE FUNCTION public.create_family_profile(
  p_id UUID,
  p_name TEXT,
  p_owner_id UUID,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT,
  p_created_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_member_count INT,
  p_max_members INT,
  p_active BOOLEAN
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  INSERT INTO public.family_profiles (
    id, name, owner_id, owner_name, owner_email, owner_phone, 
    created_at, expires_at, member_count, max_members, active
  )
  VALUES (
    p_id, p_name, p_owner_id, p_owner_name, p_owner_email, p_owner_phone, 
    p_created_at, p_expires_at, p_member_count, p_max_members, p_active
  );
$$;

-- Create RPC function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_role TEXT,
  p_family_id UUID
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  UPDATE public.wifi_users 
  SET 
    role = p_role::user_role,
    family_id = p_family_id
  WHERE id = p_user_id;
$$;

-- Create RPC function to get a family profile
CREATE OR REPLACE FUNCTION public.get_family_profile(
  p_family_id UUID
) RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  member_count INTEGER,
  max_members INTEGER,
  active BOOLEAN
) 
SECURITY DEFINER LANGUAGE SQL AS $$
  SELECT 
    id, name, owner_id, owner_name, owner_email, owner_phone, 
    created_at, expires_at, member_count, max_members, active
  FROM public.family_profiles
  WHERE id = p_family_id;
$$;

-- Create RPC function to get family members
CREATE OR REPLACE FUNCTION public.get_family_members(
  p_family_id UUID
) RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  mac_address TEXT,
  created_at TIMESTAMPTZ,
  last_connection TIMESTAMPTZ,
  role TEXT,
  active BOOLEAN
) 
SECURITY DEFINER LANGUAGE SQL AS $$
  SELECT 
    id, name, email, phone, mac_address, created_at, last_connection, role::TEXT, active
  FROM public.wifi_users
  WHERE family_id = p_family_id;
$$;

-- Create RPC function to add a family member
CREATE OR REPLACE FUNCTION public.add_family_member(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_mac_address TEXT,
  p_created_at TIMESTAMPTZ,
  p_last_connection TIMESTAMPTZ,
  p_role TEXT,
  p_family_id UUID,
  p_auth_method TEXT,
  p_active BOOLEAN
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  INSERT INTO public.wifi_users (
    id, name, email, phone, mac_address, created_at, last_connection, 
    role, family_id, auth_method, active
  )
  VALUES (
    p_id, p_name, p_email, p_phone, p_mac_address, p_created_at, p_last_connection, 
    p_role::user_role, p_family_id, p_auth_method, p_active
  );
$$;

-- Create RPC function to increment family member count
CREATE OR REPLACE FUNCTION public.increment_family_member_count(
  p_family_id UUID
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  UPDATE public.family_profiles 
  SET member_count = member_count + 1
  WHERE id = p_family_id;
$$;

-- Create RPC function to get a family member
CREATE OR REPLACE FUNCTION public.get_family_member(
  p_member_id UUID,
  p_family_id UUID
) RETURNS TABLE (
  id UUID,
  family_id UUID,
  role TEXT
) 
SECURITY DEFINER LANGUAGE SQL AS $$
  SELECT 
    id, family_id, role::TEXT
  FROM public.wifi_users
  WHERE id = p_member_id AND family_id = p_family_id;
$$;

-- Create RPC function to remove a family member
CREATE OR REPLACE FUNCTION public.remove_family_member(
  p_member_id UUID
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  DELETE FROM public.wifi_users
  WHERE id = p_member_id;
$$;

-- Create RPC function to decrement family member count
CREATE OR REPLACE FUNCTION public.decrement_family_member_count(
  p_family_id UUID
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  UPDATE public.family_profiles 
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = p_family_id;
$$;

-- Create RPC function to update a family member's status
CREATE OR REPLACE FUNCTION public.update_family_member_status(
  p_member_id UUID,
  p_is_active BOOLEAN
) RETURNS VOID 
SECURITY DEFINER LANGUAGE SQL AS $$
  UPDATE public.wifi_users 
  SET active = p_is_active
  WHERE id = p_member_id;
$$;

