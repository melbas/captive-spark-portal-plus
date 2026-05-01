-- Réinitialiser le mot de passe de l'admin melbascompts@gmail.com
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin@2026!', gen_salt('bf')),
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'melbascompts@gmail.com';