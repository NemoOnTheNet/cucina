/**
 * Accord en nombre, à la française : 0 et 1 restent au singulier.
 *
 * Écrire « 1 recette(s) » dans une interface est une négligence visible ; ce
 * helper existe pour qu'elle ne se produise nulle part.
 */
export function plural(count: number, singular: string, many = `${singular}s`): string {
  return `${count} ${count > 1 ? many : singular}`;
}
