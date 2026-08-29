import { normalizeInviteCode } from '../ids';

/**
 * Le code d'invitation mis de côté entre le clic sur le lien et l'arrivée dans
 * le foyer.
 *
 * Le détour est long : on ouvre le lien, on n'a pas de compte, on s'inscrit, on
 * va relever ses mails pour confirmer l'adresse, on revient. Le code doit
 * survivre à tout ça, sinon le lien n'apporte rien de plus que le code recopié
 * à la main.
 *
 * `localStorage` ne franchit pas le changement de navigateur — ouvrir le mail de
 * confirmation dans une autre application peut casser la chaîne. C'est du
 * meilleur effort : la saisie manuelle reste toujours possible.
 */
const KEY = 'cucina:pending-invite';

export function rememberInvite(code: string): void {
  const normalized = normalizeInviteCode(code);
  if (normalized.length === 0) return;
  try {
    localStorage.setItem(KEY, normalized);
  } catch {
    // Navigation privée, stockage refusé : on continue sans mémoriser.
  }
}

export function readInvite(): string | null {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === null ? null : normalizeInviteCode(stored) || null;
  } catch {
    return null;
  }
}

export function forgetInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Rien à faire : au pire un code périmé traîne, il sera refusé.
  }
}
