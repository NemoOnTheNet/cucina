import { describe, expect, it } from 'vitest';
import { INVITE_CODE_LENGTH, newInviteCode, normalizeInviteCode } from './ids';

describe("code d'invitation", () => {
  it('a la longueur que le champ de saisie accepte', () => {
    // Le vrai défaut vécu : la longueur générée avait changé, celle du champ non,
    // et le code transmis devenait impossible à saisir en entier. Les deux côtés
    // lisent maintenant la même constante — ce test le verrouille.
    expect(newInviteCode()).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("n'utilise que des caractères non ambigus", () => {
    // Ni O/0 ni I/1 : le code se dicte au téléphone.
    const codes = Array.from({ length: 200 }, () => newInviteCode()).join('');
    expect(codes).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    expect(codes).not.toMatch(/[OI01]/);
  });

  it('tire des codes différents', () => {
    const codes = new Set(Array.from({ length: 200 }, () => newInviteCode()));
    expect(codes.size).toBe(200);
  });

  it('met en majuscules ce qui est saisi', () => {
    expect(normalizeInviteCode('bkmr47tq')).toBe('BKMR47TQ');
  });

  it('supporte un collage avec espaces ou tirets', () => {
    expect(normalizeInviteCode(' BKMR-47TQ ')).toBe('BKMR47TQ');
    expect(normalizeInviteCode('BKM R47 TQ')).toBe('BKMR47TQ');
  });

  it("écarte les caractères qu'on ne génère jamais", () => {
    // Quelqu'un qui lit « BKMR47TQ » à voix haute peut se faire entendre « 0 »
    // pour « O » ; aucun des deux n'appartient à l'alphabet, on ne les garde pas.
    expect(normalizeInviteCode('BKM0R47I')).toBe('BKMR47');
  });

  it('ne dépasse jamais la longueur attendue', () => {
    expect(normalizeInviteCode('BKMR47TQZZZZ')).toHaveLength(INVITE_CODE_LENGTH);
  });

  it('rend une chaîne vide pour une saisie sans aucun caractère utile', () => {
    expect(normalizeInviteCode('   ---   ')).toBe('');
  });
});
