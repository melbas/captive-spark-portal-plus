import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the encrypted UniFi secret from the database and decrypts it.
 * @returns The decrypted secret string
 */
export async function getDecryptedUniFiSecret(): Promise<string> {
  // Fetch the encrypted secret from the unifi table.
  // Assuming there is a row; we take the first one.
  const { data, error } = await supabase
    .from('unifi')
    .select('secret_encrypted')
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Failed to fetch encrypted UniFi secret: ${error.message}`);
  }

  if (!data || !data.secret_encrypted) {
    throw new Error('No encrypted UniFi secret found in database');
  }

  // Decrypt using the SQL function
  const { data: decrypted, error: decryptError } = await supabase
    .rpc('decrypt_unifi_secret', { encrypted: data.secret_encrypted });

  if (decryptError) {
    throw new Error(`Failed to decrypt UniFi secret: ${decryptError.message}`);
  }

  return decrypted as string;
}