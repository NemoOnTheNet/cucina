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
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Longueur du code. Exportée, et c'est le point : le champ de saisie et sa
 * validation s'y réfèrent. Quand elle est écrite en dur des deux côtés, allonger
 * le code rend les invitations impossibles à saisir — ce qui est arrivé.
 */
export const INVITE_CODE_LENGTH = 8;

export function newInviteCode(length = INVITE_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('');
}

/**
 * Nettoie un code saisi ou collé : majuscules, et on écarte tout ce qui n'est pas
 * de l'alphabet — espaces d'un copier-coller, tirets ajoutés pour la lisibilité,
 * et les caractères ambigus qu'on n'a jamais générés.
 */
export function normalizeInviteCode(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter((character) => INVITE_ALPHABET.includes(character))
    .join('')
    .slice(0, INVITE_CODE_LENGTH);
}

export function nowIso(): string {
  return new Date().toISOString();
}
