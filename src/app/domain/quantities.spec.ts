import { describe, expect, it } from 'vitest';
import { addValues, canonicalize, formatQuantity, humanize, mergeKey, scale, toUnitId, unitFamily } from './quantities';

describe('canonicalize', () => {
  it('ramène à l\'unité canonique de la famille', () => {
    expect(canonicalize({ value: 1.5, unit: 'kg' })).toEqual({ value: 1500, unit: 'g' });
    expect(canonicalize({ value: 20, unit: 'cl' })).toEqual({ value: 200, unit: 'ml' });
    expect(canonicalize({ value: 2, unit: 'l' })).toEqual({ value: 2000, unit: 'ml' });
  });

  it('laisse intactes les unités déjà canoniques', () => {
    expect(canonicalize({ value: 3, unit: 'piece' })).toEqual({ value: 3, unit: 'piece' });
  });

  it('accepte une quantité sans valeur', () => {
    expect(canonicalize({ value: null, unit: 'kg' })).toEqual({ value: null, unit: 'g' });
  });

  it('accepte une quantité sans unité', () => {
    expect(canonicalize({ value: 2, unit: null })).toEqual({ value: 2, unit: null });
  });
});

describe('mergeKey', () => {
  it('rapproche les unités d\'une même famille', () => {
    expect(mergeKey('p', 'kg')).toBe(mergeKey('p', 'g'));
    expect(mergeKey('p', 'l')).toBe(mergeKey('p', 'ml'));
  });

  it('sépare les familles différentes', () => {
    expect(mergeKey('p', 'piece')).not.toBe(mergeKey('p', 'g'));
    expect(mergeKey('p', 'cs')).not.toBe(mergeKey('p', 'cc'));
  });

  it('sépare les produits différents', () => {
    expect(mergeKey('a', 'g')).not.toBe(mergeKey('b', 'g'));
  });
});

describe('scale', () => {
  it('met à l\'échelle les masses au centième', () => {
    expect(scale({ value: 400, unit: 'g' }, 1.5)).toEqual({ value: 600, unit: 'g' });
    expect(scale({ value: 100, unit: 'g' }, 1 / 3)).toEqual({ value: 33.33, unit: 'g' });
  });

  it('arrondit au supérieur les unités dénombrables', () => {
    expect(scale({ value: 3, unit: 'piece' }, 1.5)).toEqual({ value: 5, unit: 'piece' });
    expect(scale({ value: 1, unit: 'gousse' }, 1.2)).toEqual({ value: 2, unit: 'gousse' });
  });

  it('laisse les quantités vides vides', () => {
    expect(scale({ value: null, unit: null }, 2)).toEqual({ value: null, unit: null });
  });
});

describe('humanize / formatQuantity', () => {
  it('remonte en kg au-delà de 1000 g', () => {
    expect(humanize({ value: 1200, unit: 'g' })).toEqual({ value: 1.2, unit: 'kg' });
    expect(formatQuantity({ value: 1200, unit: 'g' })).toBe('1,2 kg');
  });

  it('reste en g en dessous', () => {
    expect(formatQuantity({ value: 700, unit: 'g' })).toBe('700 g');
  });

  it('accorde les pièces', () => {
    expect(formatQuantity({ value: 1, unit: 'piece' })).toBe('1 pièce');
    expect(formatQuantity({ value: 3, unit: 'piece' })).toBe('3 pièces');
  });

  it('n\'affiche rien sans quantité', () => {
    expect(formatQuantity({ value: null, unit: 'g' })).toBe('');
  });
});

describe('addValues', () => {
  it('traite null comme « pas de quantité », pas comme zéro', () => {
    expect(addValues(null, null)).toBeNull();
    expect(addValues(null, 5)).toBe(5);
    expect(addValues(5, null)).toBe(5);
    expect(addValues(2.5, 2.5)).toBe(5);
  });
});

describe('toUnitId', () => {
  it('accepte une unité connue', () => {
    expect(toUnitId('kg')).toBe('kg');
  });

  it('rejette ce qui n\'est pas une unité', () => {
    expect(toUnitId('cuillère magique')).toBeNull();
    expect(toUnitId(null)).toBeNull();
  });
});

describe('unitFamily', () => {
  it('regroupe les unités métriques', () => {
    expect(unitFamily('kg')).toBe('mass');
    expect(unitFamily('cl')).toBe('volume');
    expect(unitFamily(null)).toBeNull();
  });
});
