/**
 * Normalise un numéro de téléphone au format E.164 strict (`+221771234567`).
 *
 * Le portail collecte le numéro en deux parties (indicatif pays + numéro local),
 * et `users.phone` est une colonne `text` libre — donc non garantie E.164.
 *
 * Contrat `create-charge` (fail-closed) : seul `+<country><national>` est accepté.
 * Cette fonction est le SEUL endroit qui construit ce format, partagé entre
 * `AuthBox` (création/OTP) et `PaymentPortal` (wallet).
 *
 * Dégradation : entrée absente ou inutilisable → `null` (ne renvoie jamais de
 * format corrompu à l'API paiement).
 */
export function toE164(
  parts: { countryCode?: string | null; phoneNumber?: string | null }
): string | null {
  const rawCc = (parts.countryCode ?? "").trim();
  const rawNat = (parts.phoneNumber ?? "").trim();

  // Indicatif : "+221" → "221" ; "221" → "221" ; "" → null.
  const cc = rawCc.replace(/^\+/, "").replace(/\D/g, "");
  // National : on garde les chiffres seulement.
  const nat = rawNat.replace(/\D/g, "");
  if (!cc) return null;

  // National : on tolère un éventuel préfixe pays dupliqué ("221771234567").
  const digits = nat;
  if (!digits) return null;
  const national = digits.startsWith(cc) ? digits.slice(cc.length) : digits;
  if (!national) return null;

  const e164 = `+${cc}${national}`;
  return /^\+\d{6,15}$/.test(e164) ? e164 : null;
}

/**
 * Normalise un `users.phone` déjà stocké (format inconnu) vers l'E.164.
 *
 * Cas couverts : "+221 77 123 45 67", "221771234567", "771234567" (sans
 * indicatif, on suppose le Sénégal), "" / null → null.
 */
export function normalizeStoredPhone(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const digits = stored.replace(/[\s.-]/g, "").replace(/\D/g, "");
  if (!digits) return null;

  // Déjà E.164 (sans le "+") : on le re-construit.
  if (stored.trim().startsWith("+")) {
    const e = "+" + digits;
    return /^\+\d{6,15}$/.test(e) ? e : null;
  }
  // Sans indicatif : 9 chiffres sénégalais → on ajoute +221.
  if (digits.length === 9) return `+221${digits}`;
  // Sinon on suppose que c'est déjà un format international complet.
  const e = "+" + digits;
  return /^\+\d{6,15}$/.test(e) ? e : null;
}
