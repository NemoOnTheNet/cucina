/**
 * Modèles du domaine Cucina.
 *
 * ⚠️ Ce dossier ne dépend NI d'Angular NI de Supabase. Types et fonctions pures
 * uniquement (cf. docs/04-architecture.md).
 */

import type { CategoryId } from './categories';
import type { UnitId } from './quantities';

export type Uuid = string;

/** Rôle d'un membre au sein d'un foyer. */
export type MemberRole = 'owner' | 'member';

export interface Household {
  id: Uuid;
  name: string;
  ownerId: Uuid;
  createdAt: string;
}

export interface HouseholdMember {
  householdId: Uuid;
  userId: Uuid;
  role: MemberRole;
  displayName: string;
  joinedAt: string;
}

export interface HouseholdInvite {
  id: Uuid;
  householdId: Uuid;
  code: string;
  createdBy: Uuid;
  expiresAt: string;
  acceptedBy: Uuid | null;
  acceptedAt: string | null;
}

/** Tout ce qui s'achète : de la carotte au papier toilette. */
export interface Product {
  id: Uuid;
  householdId: Uuid;
  name: string;
  category: CategoryId;
  defaultUnit: UnitId | null;
  createdAt: string;
}

export interface Recipe {
  id: Uuid;
  householdId: Uuid;
  title: string;
  description: string | null;
  photoPath: string | null;
  /** Portions de référence : base de la mise à l'échelle des quantités. */
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  source: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: Uuid;
  recipeId: Uuid;
  productId: Uuid;
  /** `null` est légitime et fréquent : « sel », « huile d'olive ». */
  quantity: number | null;
  unit: UnitId | null;
  note: string | null;
  position: number;
}

export interface RecipeStep {
  id: Uuid;
  recipeId: Uuid;
  position: number;
  text: string;
}

export interface RecipeUtensil {
  id: Uuid;
  recipeId: Uuid;
  name: string;
  position: number;
}

/** Une recette avec tout son contenu, tel que manipulé par l'UI. */
export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  utensils: RecipeUtensil[];
}

export type PlanStatus = 'active' | 'archived';

/** La semaine : un panier de recettes, sans jour ni repas (cf. ADR-0003). */
export interface WeekPlan {
  id: Uuid;
  householdId: Uuid;
  status: PlanStatus;
  startedAt: string;
  archivedAt: string | null;
}

export interface WeekPlanRecipe {
  id: Uuid;
  weekPlanId: Uuid;
  recipeId: Uuid;
  /** Portions choisies pour cette planification-ci. */
  servings: number;
  addedAt: string;
}

export interface ShoppingList {
  id: Uuid;
  householdId: Uuid;
  status: PlanStatus;
  createdAt: string;
  closedAt: string | null;
}

/** D'où vient une quantité : toujours d'une recette planifiée. */
export interface ShoppingItemSource {
  id: Uuid;
  shoppingItemId: Uuid;
  weekPlanRecipeId: Uuid;
  quantity: number | null;
}

export interface ShoppingItem {
  id: Uuid;
  shoppingListId: Uuid;
  productId: Uuid;
  /** Unité canonique de la ligne. La fusion se fait sur (productId, unit). */
  unit: UnitId | null;
  /**
   * Total affiché = somme des sources + `manualQuantity`.
   * Toujours recalculé par `recomputeQuantity`, jamais écrit à la main.
   */
  quantity: number | null;
  /** Contribution saisie par un humain. Aucune opération automatique n'y touche (règle R4). */
  manualQuantity: number | null;
  /** Vrai si un humain a créé la ligne (par opposition à : générée par une recette). */
  addedManually: boolean;
  checked: boolean;
  checkedAt: string | null;
  note: string | null;
  sources: ShoppingItemSource[];
}
