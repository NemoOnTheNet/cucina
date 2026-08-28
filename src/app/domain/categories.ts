/**
 * Rayons de magasin.
 *
 * Leur seule raison d'être : ordonner la liste de courses selon le parcours réel
 * en magasin. L'ordre du tableau EST l'ordre d'affichage.
 */

export type CategoryId =
  | 'fruits-legumes'
  | 'boucherie'
  | 'frais'
  | 'surgeles'
  | 'epicerie-salee'
  | 'epicerie-sucree'
  | 'pain'
  | 'boissons'
  | 'entretien'
  | 'hygiene'
  | 'autre';

export interface Category {
  readonly id: CategoryId;
  readonly label: string;
  readonly emoji: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'fruits-legumes', label: 'Fruits & légumes', emoji: '🥕' },
  { id: 'boucherie', label: 'Boucherie & poissonnerie', emoji: '🥩' },
  { id: 'frais', label: 'Crèmerie & frais', emoji: '🧀' },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊' },
  { id: 'epicerie-salee', label: 'Épicerie salée', emoji: '🍝' },
  { id: 'epicerie-sucree', label: 'Épicerie sucrée', emoji: '🍫' },
  { id: 'pain', label: 'Pain & pâtisserie', emoji: '🥖' },
  { id: 'boissons', label: 'Boissons', emoji: '🥤' },
  { id: 'entretien', label: 'Entretien & maison', emoji: '🧽' },
  { id: 'hygiene', label: 'Hygiène & beauté', emoji: '🧴' },
  { id: 'autre', label: 'Autre', emoji: '📦' },
];

const BY_ID = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));

export const DEFAULT_CATEGORY: CategoryId = 'autre';

/** Valide une valeur venue de la base : un rayon inconnu retombe sur « Autre ». */
export function toCategoryId(value: string | null | undefined): CategoryId {
  return value !== null && value !== undefined && BY_ID.has(value as CategoryId)
    ? (value as CategoryId)
    : DEFAULT_CATEGORY;
}

export function categoryLabel(id: CategoryId): string {
  return BY_ID.get(id)?.label ?? 'Autre';
}

export function categoryEmoji(id: CategoryId): string {
  return BY_ID.get(id)?.emoji ?? '📦';
}

export function categoryOrder(id: CategoryId): number {
  const index = CATEGORIES.findIndex((c) => c.id === id);
  return index === -1 ? CATEGORIES.length : index;
}

/**
 * Devine le rayon d'un produit d'après son nom.
 *
 * Volontairement bête et faillible : c'est une proposition, jamais une vérité.
 * L'utilisateur corrige d'un geste, et sa correction est mémorisée sur le produit.
 */
const HINTS: ReadonlyArray<readonly [CategoryId, readonly string[]]> = [
  ['fruits-legumes', ['carotte', 'pomme', 'poire', 'banane', 'salade', 'tomate', 'oignon', 'ail', 'echalote', 'échalote', 'courgette', 'aubergine', 'poivron', 'patate', 'pomme de terre', 'champignon', 'citron', 'orange', 'fraise', 'framboise', 'raisin', 'melon', 'concombre', 'brocoli', 'chou', 'poireau', 'navet', 'radis', 'epinard', 'épinard', 'haricot vert', 'avocat', 'persil', 'coriandre', 'basilic', 'menthe', 'ciboulette', 'gingembre', 'courge', 'potiron', 'betterave', 'celeri', 'céleri', 'mangue', 'ananas', 'kiwi', 'peche', 'pêche', 'abricot', 'cerise', 'prune']],
  ['boucherie', ['poulet', 'boeuf', 'bœuf', 'porc', 'veau', 'agneau', 'steak', 'saucisse', 'lardon', 'jambon', 'dinde', 'canard', 'saumon', 'cabillaud', 'thon', 'crevette', 'poisson', 'merguez', 'cote de', 'côte de', 'escalope', 'viande hachee', 'viande hachée', 'chorizo', 'bacon', 'moule', 'colin', 'truite']],
  ['frais', ['lait', 'beurre', 'creme', 'crème', 'yaourt', 'fromage', 'oeuf', 'œuf', 'comte', 'comté', 'gruyere', 'gruyère', 'mozzarella', 'parmesan', 'feta', 'chevre', 'chèvre', 'ricotta', 'mascarpone', 'skyr', 'fromage blanc', 'pate feuilletee', 'pâte feuilletée', 'pate brisee', 'pâte brisée', 'tofu']],
  ['surgeles', ['surgele', 'surgelé', 'glace', 'petits pois surgel', 'frite']],
  ['epicerie-salee', ['pate', 'pâte', 'riz', 'farine', 'huile', 'vinaigre', 'sel', 'poivre', 'epice', 'épice', 'curry', 'paprika', 'cumin', 'moutarde', 'ketchup', 'mayonnaise', 'conserve', 'tomate pelee', 'tomate pelée', 'concentre', 'concentré', 'lentille', 'pois chiche', 'haricot rouge', 'quinoa', 'boulgour', 'semoule', 'couscous', 'bouillon', 'sauce soja', 'lait de coco', 'olive', 'cornichon', 'thon en boite', 'thon en boîte', 'chapelure', 'levure', 'polenta', 'nouille']],
  ['epicerie-sucree', ['sucre', 'chocolat', 'confiture', 'miel', 'biscuit', 'cereale', 'céréale', 'gateau', 'gâteau', 'compote', 'nutella', 'bonbon', 'vanille', 'amande', 'noisette', 'noix', 'raisin sec', 'sirop']],
  ['pain', ['pain', 'baguette', 'brioche', 'croissant', 'viennoiserie', 'tortilla', 'wrap', 'burger']],
  ['boissons', ['eau', 'jus', 'soda', 'biere', 'bière', 'vin', 'cafe', 'café', 'the', 'thé', 'limonade', 'coca', 'sirop de', 'champagne', 'cidre']],
  ['entretien', ['lessive', 'liquide vaisselle', 'eponge', 'éponge', 'sopalin', 'essuie-tout', 'sac poubelle', 'poubelle', 'nettoyant', 'javel', 'papier aluminium', 'film etirable', 'film étirable', 'papier cuisson', 'ampoule', 'pile', 'adoucissant', 'balai', 'serpilliere', 'serpillière']],
  ['hygiene', ['papier toilette', 'pq', 'dentifrice', 'brosse a dent', 'brosse à dent', 'shampoing', 'savon', 'gel douche', 'deodorant', 'déodorant', 'rasoir', 'mouchoir', 'coton', 'creme solaire', 'crème solaire', 'couche', 'lingette', 'protection']],
];

export function guessCategory(productName: string): CategoryId {
  const name = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (name.length === 0) return DEFAULT_CATEGORY;

  let best: { category: CategoryId; length: number } | null = null;
  for (const [category, hints] of HINTS) {
    for (const hint of hints) {
      const normalized = hint.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (name.includes(normalized) && (best === null || normalized.length > best.length)) {
        best = { category, length: normalized.length };
      }
    }
  }
  return best?.category ?? DEFAULT_CATEGORY;
}
