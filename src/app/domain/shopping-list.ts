/**
 * Les règles R1 → R6 de la liste de courses (cf. docs/02-domaine.md).
 *
 * C'est le seul endroit vraiment délicat du produit. Tout est pur : aucune de
 * ces fonctions ne connaît Angular, Supabase ou le réseau. Elles reçoivent l'état
 * courant, retournent le nouvel état ET la liste des écritures à persister.
 */

import type { ShoppingItem, ShoppingItemSource, Uuid } from './models';
import { addValues, canonicalize, mergeKey, scale, type Quantity, type UnitId } from './quantities';

/** Un besoin à faire entrer dans la liste. */
export interface Need {
  readonly productId: Uuid;
  readonly quantity: number | null;
  readonly unit: UnitId | null;
  /** Recette planifiée à l'origine du besoin. `null` = ajout manuel. */
  readonly weekPlanRecipeId: Uuid | null;
}

export type ItemMutation =
  | { readonly kind: 'create'; readonly item: ShoppingItem }
  | { readonly kind: 'update'; readonly item: ShoppingItem }
  | { readonly kind: 'delete'; readonly itemId: Uuid };

export interface ListChange {
  readonly items: ShoppingItem[];
  readonly mutations: ItemMutation[];
  /** Lignes nouvellement créées. */
  readonly created: number;
  /** Lignes existantes qui ont absorbé un besoin (règle R2). */
  readonly merged: number;
  /** Lignes supprimées. */
  readonly removed: number;
}

/** Fabrique d'identifiants, injectée pour rester pur et testable. */
export type IdFactory = () => Uuid;

/**
 * Total affiché d'une ligne = somme des contributions des recettes + contribution
 * manuelle. Jamais écrit à la main : toujours recalculé ici.
 */
export function recomputeQuantity(item: ShoppingItem): number | null {
  const fromSources = item.sources.reduce<number | null>(
    (total, source) => addValues(total, source.quantity),
    null,
  );
  const total = addValues(fromSources, item.manualQuantity);
  if (total === null) return null;
  // Une ligne ne peut pas valoir une quantité négative : on retombe sur « pas de quantité ».
  return total > 0 ? total : null;
}

function withRecomputedQuantity(item: ShoppingItem): ShoppingItem {
  return { ...item, quantity: recomputeQuantity(item) };
}

/**
 * R1 + R2 — fait entrer des besoins dans la liste.
 *
 * Chaque besoin rejoint la ligne de même (produit, unité canonique) si elle
 * existe, sinon crée une ligne. Les unités de familles différentes ne fusionnent
 * jamais : « 2 pièces » et « 200 g » de carottes restent deux lignes.
 */
export function addNeeds(
  items: readonly ShoppingItem[],
  needs: readonly Need[],
  listId: Uuid,
  newId: IdFactory,
): ListChange {
  const next = items.map((item) => ({ ...item, sources: [...item.sources] }));
  const byKey = new Map<string, ShoppingItem>();
  for (const item of next) byKey.set(mergeKey(item.productId, item.unit), item);

  const touched = new Set<Uuid>();
  const createdIds = new Set<Uuid>();
  let created = 0;
  let merged = 0;

  for (const need of needs) {
    const canonical = canonicalize({ value: need.quantity, unit: need.unit });
    const key = mergeKey(need.productId, need.unit);
    let item = byKey.get(key) ?? adoptUnitlessLine(byKey, next, need, canonical.unit);

    if (item === undefined) {
      item = {
        id: newId(),
        shoppingListId: listId,
        productId: need.productId,
        unit: canonical.unit,
        quantity: null,
        manualQuantity: null,
        addedManually: need.weekPlanRecipeId === null,
        checked: false,
        checkedAt: null,
        note: null,
        sources: [],
      };
      next.push(item);
      byKey.set(key, item);
      createdIds.add(item.id);
      created += 1;
    } else {
      // Un besoin qui rejoint une ligne existante — y compris une ligne créée
      // juste avant dans le même lot — compte comme une fusion (règle R2).
      merged += 1;
    }

    if (need.weekPlanRecipeId === null) {
      // Ajout manuel : la contribution humaine s'additionne à elle-même (R4).
      item.manualQuantity = addValues(item.manualQuantity, canonical.value);
      item.addedManually = true;
    } else {
      const source: ShoppingItemSource = {
        id: newId(),
        shoppingItemId: item.id,
        weekPlanRecipeId: need.weekPlanRecipeId,
        quantity: canonical.value,
      };
      item.sources.push(source);
    }
    item.quantity = recomputeQuantity(item);
    touched.add(item.id);
  }

  const mutations: ItemMutation[] = next
    .filter((item) => touched.has(item.id))
    .map((item) => (createdIds.has(item.id) ? { kind: 'create' as const, item } : { kind: 'update' as const, item }));

  return { items: next, mutations, created, merged, removed: 0 };
}

/**
 * Précision de la règle R2 : une ligne SANS unité n'est pas « une autre unité »,
 * c'est l'absence d'unité. « Carottes » noté à la main doit absorber les 600 g
 * demandés par une recette, plutôt que produire deux lignes « Carottes ».
 *
 * - un besoin chiffré rejoint la ligne sans unité, qui adopte alors l'unité ;
 * - un besoin sans unité rejoint n'importe quelle ligne existante du produit.
 */
function adoptUnitlessLine(
  byKey: Map<string, ShoppingItem>,
  items: readonly ShoppingItem[],
  need: Need,
  canonicalUnit: UnitId | null,
): ShoppingItem | undefined {
  if (canonicalUnit === null) {
    const anyLine = items.find((item) => item.productId === need.productId);
    if (anyLine) return anyLine;
    return undefined;
  }

  const unitless = byKey.get(mergeKey(need.productId, null));
  if (!unitless) return undefined;

  // Une ligne sans unité MAIS avec un nombre (« 3 » de carottes) est ambiguë :
  // 3 quoi ? On refuse de trancher, donc on ne fusionne pas. Deux lignes
  // honnêtes valent mieux qu'un « 603 g » inventé.
  if (unitless.quantity !== null) return undefined;

  unitless.unit = canonicalUnit;
  byKey.delete(mergeKey(need.productId, null));
  byKey.set(mergeKey(need.productId, canonicalUnit), unitless);
  return unitless;
}

/**
 * R3 — retire d'une liste tout ce qu'une recette planifiée y avait apporté,
 * et rien d'autre.
 *
 * - la ligne garde ses autres origines et sa contribution manuelle ;
 * - une ligne devenue vide disparaît…
 * - …sauf si elle est déjà cochée : l'article est dans le caddie, le faire
 *   disparaître serait mentir sur le contenu du caddie.
 */
export function removeRecipeContribution(items: readonly ShoppingItem[], weekPlanRecipeId: Uuid): ListChange {
  const kept: ShoppingItem[] = [];
  const mutations: ItemMutation[] = [];
  let removed = 0;

  for (const item of items) {
    const sources = item.sources.filter((source) => source.weekPlanRecipeId !== weekPlanRecipeId);
    if (sources.length === item.sources.length) {
      kept.push(item);
      continue;
    }

    const updated = withRecomputedQuantity({ ...item, sources });
    const isEmpty = sources.length === 0 && updated.manualQuantity === null && !updated.addedManually;

    if (isEmpty && !updated.checked) {
      mutations.push({ kind: 'delete', itemId: updated.id });
      removed += 1;
      continue;
    }
    kept.push(updated);
    mutations.push({ kind: 'update', item: updated });
  }

  return { items: kept, mutations, created: 0, merged: 0, removed };
}

/**
 * R4 — une quantité saisie à la main n'est jamais écrasée.
 *
 * L'utilisateur saisit un TOTAL. On en déduit sa contribution propre, de sorte
 * qu'ajouter une recette plus tard s'additionne par-dessus au lieu de remplacer.
 */
export function setManualTotal(item: ShoppingItem, total: number | null): ShoppingItem {
  const fromSources = item.sources.reduce<number | null>(
    (sum, source) => addValues(sum, source.quantity),
    null,
  );
  if (total === null) {
    return withRecomputedQuantity({ ...item, manualQuantity: null });
  }
  const manual = addValues(total, fromSources === null ? null : -fromSources);
  return withRecomputedQuantity({ ...item, manualQuantity: manual });
}

/** Change l'unité d'une ligne saisie à la main (les contributions restent inchangées). */
export function setUnit(item: ShoppingItem, unit: UnitId | null): ShoppingItem {
  const canonical = canonicalize({ value: null, unit });
  return { ...item, unit: canonical.unit };
}

export function toggleChecked(item: ShoppingItem, now: () => string = () => new Date().toISOString()): ShoppingItem {
  const checked = !item.checked;
  return { ...item, checked, checkedAt: checked ? now() : null };
}

/** Quantité affichable d'une ligne. */
export function itemQuantity(item: ShoppingItem): Quantity {
  return { value: item.quantity, unit: item.unit };
}

/**
 * R1 — traduit une recette planifiée en besoins, quantités mises à l'échelle des
 * portions choisies.
 */
export interface ScalableIngredient {
  readonly productId: Uuid;
  readonly quantity: number | null;
  readonly unit: UnitId | null;
}

export function needsFromPlannedRecipe(
  ingredients: readonly ScalableIngredient[],
  referenceServings: number,
  chosenServings: number,
  weekPlanRecipeId: Uuid,
): Need[] {
  const safeReference = referenceServings > 0 ? referenceServings : 1;
  const factor = chosenServings / safeReference;
  return ingredients.map((ingredient) => {
    const scaled = scale({ value: ingredient.quantity, unit: ingredient.unit }, factor);
    return {
      productId: ingredient.productId,
      quantity: scaled.value,
      unit: scaled.unit,
      weekPlanRecipeId,
    };
  });
}
