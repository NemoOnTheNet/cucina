/** Génération d'identifiants. Isolée pour rester injectable et testable. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Code d'invitation court, lisible à voix haute et sans caractère ambigu.
 *
 * Huit caractères sur 32 symboles : ~10^12 combinaisons. `invite_preview` est
 * ouverte aux visiteurs anonymes — il faut donc que le balayage soit hors de
 * portée, sans rendre le code impossible à dicter au téléphone.
 * 256 est un multiple de 32 : le tirage reste uniforme.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newInviteCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function nowIso(): string {
  return new Date().toISOString();
}
