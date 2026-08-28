import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryLabel, categoryOrder, guessCategory, toCategoryId } from './categories';

describe('guessCategory', () => {
  it('reconnaît les produits frais et les légumes', () => {
    expect(guessCategory('Carottes')).toBe('fruits-legumes');
    expect(guessCategory('lait demi-écrémé')).toBe('frais');
    expect(guessCategory('Blanc de poulet')).toBe('boucherie');
  });

  it('reconnaît le non-alimentaire, qui est la moitié du panier', () => {
    expect(guessCategory('Papier toilette')).toBe('hygiene');
    expect(guessCategory('Lessive')).toBe('entretien');
    expect(guessCategory('Eau en bouteille')).toBe('boissons');
  });

  it('ignore accents et casse', () => {
    expect(guessCategory('ÉCHALOTE')).toBe('fruits-legumes');
    expect(guessCategory('creme fraiche')).toBe('frais');
  });

  it('privilégie l\'indice le plus long : « pâte feuilletée » n\'est pas des pâtes', () => {
    expect(guessCategory('Pâte feuilletée')).toBe('frais');
    expect(guessCategory('Pâtes')).toBe('epicerie-salee');
  });

  it('retombe sur « autre » quand elle ne sait pas', () => {
    expect(guessCategory('Bidule improbable')).toBe('autre');
    expect(guessCategory('')).toBe('autre');
  });
});

describe('toCategoryId', () => {
  it('accepte un rayon connu', () => {
    expect(toCategoryId('frais')).toBe('frais');
  });

  it('retombe sur « autre » pour une valeur inconnue ou absente', () => {
    expect(toCategoryId('rayon-fantome')).toBe('autre');
    expect(toCategoryId(null)).toBe('autre');
    expect(toCategoryId(undefined)).toBe('autre');
  });
});

describe('ordre des rayons', () => {
  it('suit le parcours en magasin', () => {
    expect(categoryOrder('fruits-legumes')).toBeLessThan(categoryOrder('entretien'));
    expect(categoryOrder('autre')).toBe(CATEGORIES.length - 1);
  });

  it('a un libellé pour chaque rayon', () => {
    for (const category of CATEGORIES) {
      expect(categoryLabel(category.id).length).toBeGreaterThan(0);
    }
  });
});
