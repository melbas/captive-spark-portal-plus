// Chiffrement/déchiffrement AES-256-GCM du mot de passe contrôleur UniFi.
// Format stocké dans hardware_integrations.api_password_enc :
//   "enc:gcm:<iv_base64>:<ciphertext_base64>"
// (toute valeur sans ce préfixe est traitée comme du legacy en clair pour
//  permettre la migration progressive — voir RAPPORT-BACKEND.md.)
// Secret : ENCRYPTION_KEY (32 bytes hex ou base64) défini via
//   npx supabase secrets set ENCRYPTION_KEY=...
// JAMAIS de secret en dur dans ce fichier.

const ENC_PREFIX = "enc:gcm:";

async function loadKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("ENCRYPTION_KEY");
  if (!raw) {
    throw new Error("ENCRYPTION_KEY absent — mot de passe UniFi non déchiffrable");
  }
  let bytes: Uint8Array;
  const hex = raw.replace(/-/g, "");
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    bytes = new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  } else {
    bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  }
  if (bytes.length !== 32) throw new Error("ENCRYPTION_KEY doit faire 32 bytes");
  // Copie dans un ArrayBuffer dédié (typage strict BufferSource)
  const ab = new ArrayBuffer(32);
  new Uint8Array(ab).set(bytes);
  return crypto.subtle.importKey("raw", ab, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await loadKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
  return `${ENC_PREFIX}${b64(iv)}:${b64(new Uint8Array(ct))}`;
}

export async function decryptSecret(stored: string): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) {
    // Legacy : valeur stockée en clair (avant migration pgcrypto/AES-GCM).
    // Loggué pour piloter la rotation — comportement transitoire documenté.
    console.warn("[crypto] valeur legacy en clair détectée — à re-chiffrer");
    return stored;
  }
  const [, ivB64, ctB64] = stored.split(":");
  const key = await loadKey();
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
