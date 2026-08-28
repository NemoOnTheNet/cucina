import { describe, expect, it } from 'vitest';
import type { ShoppingItem, Uuid } from './models';
import {
  addNeeds,
  annotateItem,
  checkItem,
  needsFromPlannedRecipe,
  recomputeQuantity,
  removeRecipeContribution,
  retotalItem,
  setManualTotal,
  type Need,
} from './shopping-list';

const LIST: Uuid = 'list-1';
const CARROT = 'p-carrot';
const CREAM = 'p-cream';
const SALT = 'p-salt';
const CURRY = 'wpr-curry';
const SOUP = 'wpr-soup';

function idFactory(): () => Uuid {
  let n = 0;
  return () => `id-${++n}`;
}

function need(partial: Partial<Need> & { productId: string }): Need {
  return { quantity: null, unit: null, weekPlanRecipeId: null, ...partial };
}

function item(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'i-1',
    shoppingListId: LIST,
    productId: CARROT,
    unit: 'g',
    quantity: 400,
    manualQuantity: null,
    addedManually: false,
    checked: false,
    checkedAt: null,
    note: null,
    sources: [{ id: 's-1', shoppingItemId: 'i-1', weekPlanRecipeId: CURRY, quantity: 400 }],
    ...overrides,
  };
}

describe('R1 — une recette planifiée alimente la liste', () => {
  it('crée une ligne par ingrédient', () => {
    const result = addNeeds([], [
      need({ productId: CARROT, quantity: 400, unit: 'g', weekPlanRecipeId: CURRY }),
      need({ productId: CREAM, quantity: 20, unit: 'cl', weekPlanRecipeId: CURRY }),
    ], LIST, idFactory());

    expect(result.created).toBe(2);
    expect(result.merged).toBe(0);
    expect(result.items).toHaveLength(2);
    expect(result.mutations.every((m) => m.kind === 'create')).toBe(true);
  });

  it('met les quantités à l\'échelle des portions choisies', () => {
    const needs = needsFromPlannedRecipe(
      [{ productId: CARROT, quantity: 400, unit: 'g' }, { productId: SALT, quantity: null, unit: null }],
      4,
      6,
      CURRY,
    );
    expect(needs[0].quantity).toBe(600);
    expect(needs[1].quantity).toBeNull();
  });

  it('arrondit au supérieur les unités dénombrables : pas d\'demi-œuf', () => {
    const needs = needsFromPlannedRecipe([{ productId: 'p-egg', quantity: 3, unit: 'piece' }], 4, 6, CURRY);
    expect(needs[0].quantity).toBe(5);
  });

  it('supporte un nombre de portions de référence aberrant', () => {
    const needs = needsFromPlannedRecipe([{ productId: CARROT, quantity: 100, unit: 'g' }], 0, 2, CURRY);
    expect(needs[0].quantity).toBe(200);
  });

  it('conserve une quantité vide (« sel »)', () => {
    const result = addNeeds([], [need({ productId: SALT, weekPlanRecipeId: CURRY })], LIST, idFactory());
    expect(result.items[0].quantity).toBeNull();
  });
});

describe('R2 — fusion sur (produit, unité canonique)', () => {
  it('additionne deux besoins du même produit dans la même unité', () => {
    const result = addNeeds([], [
      need({ productId: CARROT, quantity: 400, unit: 'g', weekPlanRecipeId: CURRY }),
      need({ productId: CARROT, quantity: 300, unit: 'g', weekPlanRecipeId: SOUP }),
    ], LIST, idFactory());

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(700);
    expect(result.created).toBe(1);
    expect(result.merged).toBe(1);
  });

  it('convertit à l\'intérieur d\'une même famille métrique : 1 kg + 300 g = 1300 g', () => {
    const result = addNeeds([], [
      need({ productId: CARROT, quantity: 1, unit: 'kg', weekPlanRecipeId: CURRY }),
      need({ productId: CARROT, quantity: 300, unit: 'g', weekPlanRecipeId: SOUP }),
    ], LIST, idFactory());

    expect(result.items).toHaveLength(1);
    expect(result.items[0].unit).toBe('g');
    expect(result.items[0].quantity).toBe(1300);
  });

  it('ne convertit JAMAIS entre familles : 2 pièces et 200 g restent deux lignes', () => {
    const result = addNeeds([], [
      need({ productId: CARROT, quantity: 2, unit: 'piece', weekPlanRecipeId: CURRY }),
      need({ productId: CARROT, quantity: 200, unit: 'g', weekPlanRecipeId: SOUP }),
    ], LIST, idFactory());

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.unit).sort()).toEqual(['g', 'piece']);
  });

  it('fusionne un ajout manuel avec une ligne issue d\'une recette', () => {
    const existing = item();
    const result = addNeeds([existing], [
      need({ productId: CARROT, quantity: 200, unit: 'g' }),
    ], LIST, idFactory());

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(600);
    expect(result.items[0].addedManually).toBe(true);
    expect(result.merged).toBe(1);
  });

  it('une ligne sans unité absorbe une quantité chiffrée et adopte son unité', () => {
    const manual = addNeeds([], [need({ productId: CARROT })], LIST, idFactory());
    expect(manual.items[0].unit).toBeNull();

    const result = addNeeds(
      manual.items,
      [need({ productId: CARROT, quantity: 600, unit: 'g', weekPlanRecipeId: CURRY })],
      LIST,
      idFactory(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].unit).toBe('g');
    expect(result.items[0].quantity).toBe(600);
    expect(result.items[0].addedManually).toBe(true);
    expect(result.merged).toBe(1);
  });

  it('une ligne chiffrée SANS unité ne fusionne pas avec des grammes : « 3 » de quoi ?', () => {
    const manual = addNeeds([], [need({ productId: CARROT, quantity: 3 })], LIST, idFactory());
    expect(manual.items[0].quantity).toBe(3);
    expect(manual.items[0].unit).toBeNull();

    const result = addNeeds(
      manual.items,
      [need({ productId: CARROT, quantity: 600, unit: 'g', weekPlanRecipeId: CURRY })],
      LIST,
      idFactory(),
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.quantity).sort()).toEqual([3, 600]);
  });

  it('un ajout manuel sans quantité rejoint la ligne chiffrée existante', () => {
    const result = addNeeds([item()], [need({ productId: CARROT })], LIST, idFactory());
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(400);
    expect(result.items[0].addedManually).toBe(true);
  });

  it('garde une trace de chaque origine', () => {
    const result = addNeeds([], [
      need({ productId: CARROT, quantity: 400, unit: 'g', weekPlanRecipeId: CURRY }),
      need({ productId: CARROT, quantity: 300, unit: 'g', weekPlanRecipeId: SOUP }),
    ], LIST, idFactory());

    expect(result.items[0].sources.map((s) => s.weekPlanRecipeId)).toEqual([CURRY, SOUP]);
  });
});

describe('R3 — retirer une recette retire ce qu\'elle avait apporté, et rien d\'autre', () => {
  it('supprime une ligne qui ne venait que de cette recette', () => {
    const result = removeRecipeContribution([item()], CURRY);
    expect(result.items).toHaveLength(0);
    expect(result.removed).toBe(1);
    expect(result.mutations).toEqual([{ kind: 'delete', itemId: 'i-1' }]);
  });

  it('diminue une ligne partagée avec une autre recette', () => {
    const shared = item({
      quantity: 700,
      sources: [
        { id: 's-1', shoppingItemId: 'i-1', weekPlanRecipeId: CURRY, quantity: 400 },
        { id: 's-2', shoppingItemId: 'i-1', weekPlanRecipeId: SOUP, quantity: 300 },
      ],
    });
    const result = removeRecipeContribution([shared], CURRY);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(300);
  });

  it('conserve une ligne DÉJÀ COCHÉE : elle est dans le caddie', () => {
    const result = removeRecipeContribution([item({ checked: true })], CURRY);
    expect(result.items).toHaveLength(1);
    expect(result.removed).toBe(0);
    expect(result.items[0].checked).toBe(true);
  });

  it('conserve une ligne aussi ajoutée à la main', () => {
    const result = removeRecipeContribution([item({ addedManually: true, manualQuantity: 200, quantity: 600 })], CURRY);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(200);
  });

  it('ne touche pas aux lignes étrangères à la recette', () => {
    const other = item({ id: 'i-2', productId: CREAM, sources: [{ id: 's-9', shoppingItemId: 'i-2', weekPlanRecipeId: SOUP, quantity: 200 }] });
    const result = removeRecipeContribution([other], CURRY);
    expect(result.items).toEqual([other]);
    expect(result.mutations).toHaveLength(0);
  });
});

describe('R4 — le manuel est intouchable', () => {
  it('une saisie manuelle fixe le total affiché', () => {
    const updated = setManualTotal(item(), 1000);
    expect(updated.quantity).toBe(1000);
    expect(updated.manualQuantity).toBe(600);
  });

  it('une recette ajoutée ensuite s\'additionne au-dessus, sans écraser', () => {
    const overridden = setManualTotal(item(), 1000);
    const result = addNeeds([overridden], [
      need({ productId: CARROT, quantity: 300, unit: 'g', weekPlanRecipeId: SOUP }),
    ], LIST, idFactory());

    expect(result.items[0].quantity).toBe(1300);
    expect(result.items[0].manualQuantity).toBe(600);
  });

  it('retirer la recette d\'origine laisse la part manuelle intacte', () => {
    const overridden = setManualTotal(item(), 1000);
    const result = removeRecipeContribution([overridden], CURRY);
    expect(result.items[0].quantity).toBe(600);
  });

  it('effacer la quantité saisie revient aux seules contributions des recettes', () => {
    const cleared = setManualTotal(setManualTotal(item(), 1000), null);
    expect(cleared.quantity).toBe(400);
    expect(cleared.manualQuantity).toBeNull();
  });

  it('un total inférieur aux contributions ne produit pas de quantité négative', () => {
    const lowered = setManualTotal(item(), 100);
    const result = removeRecipeContribution([lowered], CURRY);
    expect(result.items[0].quantity).toBeNull();
  });
});

describe('cocher / décocher', () => {
  it('cocher horodate, décocher efface l\'horodatage', () => {
    const checked = checkItem(item(), () => '2026-08-26T10:00:00.000Z').item;
    expect(checked.checked).toBe(true);
    expect(checked.checkedAt).toBe('2026-08-26T10:00:00.000Z');
    expect(checkItem(checked).item.checkedAt).toBeNull();
  });
});

describe('recomputeQuantity', () => {
  it('vaut null quand rien n\'est chiffré', () => {
    expect(recomputeQuantity(item({ quantity: null, sources: [{ id: 's', shoppingItemId: 'i-1', weekPlanRecipeId: CURRY, quantity: null }] }))).toBeNull();
  });

  it('ignore les contributions vides parmi des contributions chiffrées', () => {
    const mixed = item({
      sources: [
        { id: 's-1', shoppingItemId: 'i-1', weekPlanRecipeId: CURRY, quantity: 400 },
        { id: 's-2', shoppingItemId: 'i-1', weekPlanRecipeId: SOUP, quantity: null },
      ],
    });
    expect(recomputeQuantity(mixed)).toBe(400);
  });
});

describe('actions locales sur une ligne', () => {
  const base: ShoppingItem = {
    id: 'i-1',
    shoppingListId: 'l-1',
    productId: 'p-1',
    unit: 'g',
    quantity: 600,
    manualQuantity: null,
    addedManually: false,
    checked: false,
    checkedAt: null,
    note: null,
    sources: [{ id: 's-1', shoppingItemId: 'i-1', weekPlanRecipeId: 'wpr-1', quantity: 600 }],
  };

  it('cocher n\'écrit que « checked » et sa date', () => {
    const change = checkItem(base, () => '2026-01-01T10:00:00.000Z');

    expect(change.mutation).toEqual({
      kind: 'patch',
      itemId: 'i-1',
      changes: { checked: true, checkedAt: '2026-01-01T10:00:00.000Z' },
    });
    expect(change.item.checked).toBe(true);
  });

  it('décocher efface la date', () => {
    const change = checkItem({ ...base, checked: true, checkedAt: '2026-01-01T10:00:00.000Z' });

    expect(change.mutation).toEqual({
      kind: 'patch',
      itemId: 'i-1',
      changes: { checked: false, checkedAt: null },
    });
  });

  it('aucune action locale ne touche aux origines de la ligne', () => {
    for (const change of [checkItem(base), annotateItem(base, 'bio'), retotalItem(base, 800, 'g')]) {
      expect(change.mutation.kind).toBe('patch');
      if (change.mutation.kind === 'patch') {
        expect(change.mutation.changes).not.toHaveProperty('sources');
      }
      expect(change.item.sources).toEqual(base.sources);
    }
  });

  it('une note vide redevient « pas de note »', () => {
    expect(annotateItem(base, '   ').mutation).toEqual({
      kind: 'patch',
      itemId: 'i-1',
      changes: { note: null },
    });
    expect(annotateItem(base, '  bio  ').item.note).toBe('bio');
  });

  it('fixer un total déduit la part humaine sans écraser celle des recettes (R4)', () => {
    const change = retotalItem(base, 800, 'g');

    expect(change.item.quantity).toBe(800);
    expect(change.item.manualQuantity).toBe(200);
    expect(change.mutation).toEqual({
      kind: 'patch',
      itemId: 'i-1',
      changes: { unit: 'g', quantity: 800, manualQuantity: 200 },
    });
  });

  it('fixer un total dans une autre unité convertit la valeur, pas seulement l\'unité', () => {
    const change = retotalItem(base, 1, 'kg');

    expect(change.item.unit).toBe('g');
    expect(change.item.quantity).toBe(1000);
    // La recette apporte toujours ses 600 g : la part humaine est le reste.
    expect(change.item.manualQuantity).toBe(400);
  });

  it('vider le total efface la seule part humaine', () => {
    const withManual = { ...base, manualQuantity: 200, quantity: 800 };
    const change = retotalItem(withManual, null, 'g');

    expect(change.item.manualQuantity).toBeNull();
    expect(change.item.quantity).toBe(600);
  });
});
