/**
 * Quantités et unités.
 *
 * Règle R2 : on ne convertit JAMAIS entre deux natures différentes (une carotte
 * pèse entre 60 et 200 g). On convertit uniquement à l'intérieur d'une même
 * famille métrique, où la conversion est exacte (1 kg = 1000 g).
 */

export type UnitId =
  | 'g'
  | 'kg'
  | 'ml'
  | 'cl'
  | 'l'
  | 'piece'
  | 'cs'
  | 'cc'
  | 'pincee'
  | 'sachet'
  | 'boite'
  | 'tranche'
  | 'botte'
  | 'gousse';

/** Familles d'unités. La conversion n'existe qu'à l'intérieur d'une famille. */
export type UnitFamily = 'mass' | 'volume' | 'count' | 'spoon' | 'teaspoon' | 'pinch' | 'pack' | 'box' | 'slice' | 'bunch' | 'clove';

interface UnitDefinition {
  readonly id: UnitId;
  readonly family: UnitFamily;
  /** Facteur vers l'unité canonique de la famille. */
  readonly factor: number;
  readonly short: string;
  /** Libellé au singulier / pluriel, pour l'affichage. */
  readonly one: string;
  readonly many: string;
}

const DEFINITIONS: readonly UnitDefinition[] = [
  { id: 'g', family: 'mass', factor: 1, short: 'g', one: 'g', many: 'g' },
  { id: 'kg', family: 'mass', factor: 1000, short: 'kg', one: 'kg', many: 'kg' },
  { id: 'ml', family: 'volume', factor: 1, short: 'ml', one: 'ml', many: 'ml' },
  { id: 'cl', family: 'volume', factor: 10, short: 'cl', one: 'cl', many: 'cl' },
  { id: 'l', family: 'volume', factor: 1000, short: 'L', one: 'L', many: 'L' },
  { id: 'piece', family: 'count', factor: 1, short: '', one: 'pièce', many: 'pièces' },
  { id: 'cs', family: 'spoon', factor: 1, short: 'c. à s.', one: 'c. à s.', many: 'c. à s.' },
  { id: 'cc', family: 'teaspoon', factor: 1, short: 'c. à c.', one: 'c. à c.', many: 'c. à c.' },
  { id: 'pincee', family: 'pinch', factor: 1, short: 'pincée', one: 'pincée', many: 'pincées' },
  { id: 'sachet', family: 'pack', factor: 1, short: 'sachet', one: 'sachet', many: 'sachets' },
  { id: 'boite', family: 'box', factor: 1, short: 'boîte', one: 'boîte', many: 'boîtes' },
  { id: 'tranche', family: 'slice', factor: 1, short: 'tranche', one: 'tranche', many: 'tranches' },
  { id: 'botte', family: 'bunch', factor: 1, short: 'botte', one: 'botte', many: 'bottes' },
  { id: 'gousse', family: 'clove', factor: 1, short: 'gousse', one: 'gousse', many: 'gousses' },
];

const BY_ID = new Map<UnitId, UnitDefinition>(DEFINITIONS.map((d) => [d.id, d]));

/** Unité canonique de chaque famille : celle dans laquelle on stocke. */
const CANONICAL: Record<UnitFamily, UnitId> = {
  mass: 'g',
  volume: 'ml',
  count: 'piece',
  spoon: 'cs',
  teaspoon: 'cc',
  pinch: 'pincee',
  pack: 'sachet',
  box: 'boite',
  slice: 'tranche',
  bunch: 'botte',
  clove: 'gousse',
};

/** Unités proposées à la saisie, dans un ordre utile. */
export const SELECTABLE_UNITS: readonly UnitId[] = [
  'g', 'kg', 'ml', 'cl', 'l', 'piece', 'cs', 'cc', 'pincee', 'sachet', 'boite', 'tranche', 'botte', 'gousse',
];

export interface Quantity {
  readonly value: number | null;
  readonly unit: UnitId | null;
}

export const EMPTY_QUANTITY: Quantity = { value: null, unit: null };

/** Valide une valeur venue de la base : une unité inconnue devient « pas d'unité ». */
export function toUnitId(value: string | null | undefined): UnitId | null {
  return value !== null && value !== undefined && BY_ID.has(value as UnitId) ? (value as UnitId) : null;
}

export function unitLabel(unit: UnitId | null, plural = true): string {
  if (unit === null) return '';
  const def = BY_ID.get(unit);
  if (!def) return '';
  return plural ? def.many : def.one;
}

export function unitFamily(unit: UnitId | null): UnitFamily | null {
  if (unit === null) return null;
  return BY_ID.get(unit)?.family ?? null;
}

/**
 * Ramène une quantité à l'unité canonique de sa famille.
 * `3 kg` → `3000 g`. `2 pièces` → `2 pièces`. Une unité inconnue est ignorée.
 */
export function canonicalize(quantity: Quantity): Quantity {
  const def = quantity.unit === null ? undefined : BY_ID.get(quantity.unit);
  if (!def) return { value: quantity.value, unit: null };
  const canonicalUnit = CANONICAL[def.family];
  if (quantity.value === null) return { value: null, unit: canonicalUnit };
  return { value: round(quantity.value * def.factor), unit: canonicalUnit };
}

/**
 * Clé de fusion d'une ligne de liste : deux besoins fusionnent si et seulement
 * si cette clé est identique (règle R2).
 */
export function mergeKey(productId: string, unit: UnitId | null): string {
  const canonical = canonicalize({ value: null, unit });
  return `${productId}::${canonical.unit ?? '-'}`;
}

/** Additionne deux quantités déjà canonisées. `null + null = null`. */
export function addValues(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return round((a ?? 0) + (b ?? 0));
}

/**
 * Met une quantité à l'échelle (portions choisies / portions de référence).
 * Les unités dénombrables sont arrondies au supérieur : on n'achète pas 1,5 œuf.
 */
export function scale(quantity: Quantity, factor: number): Quantity {
  if (quantity.value === null) return quantity;
  const scaled = quantity.value * factor;
  const family = unitFamily(quantity.unit);
  const isCountable = family !== null && family !== 'mass' && family !== 'volume';
  return { value: isCountable ? Math.ceil(scaled) : round(scaled), unit: quantity.unit };
}

/**
 * Choisit l'unité la plus lisible pour l'affichage : 1200 g → 1,2 kg.
 * N'altère jamais la valeur stockée.
 */
export function humanize(quantity: Quantity): Quantity {
  if (quantity.value === null || quantity.unit === null) return quantity;
  if (quantity.unit === 'g' && Math.abs(quantity.value) >= 1000) {
    return { value: round(quantity.value / 1000), unit: 'kg' };
  }
  if (quantity.unit === 'ml' && Math.abs(quantity.value) >= 1000) {
    return { value: round(quantity.value / 1000), unit: 'l' };
  }
  return quantity;
}

/** Rendu français d'une quantité : « 1,2 kg », « 3 pièces », « » si vide. */
export function formatQuantity(quantity: Quantity): string {
  const display = humanize(quantity);
  if (display.value === null) return '';
  const value = formatNumber(display.value);
  const label = unitLabel(display.unit, display.value > 1);
  if (display.unit === null) return value;
  if (display.unit === 'piece') return `${value} ${label}`;
  return `${value} ${label}`.trim();
}

export function formatNumber(value: number): string {
  return round(value).toString().replace('.', ',');
}

/** Deux décimales : au-delà, c'est du faux précis sur des ingrédients. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
