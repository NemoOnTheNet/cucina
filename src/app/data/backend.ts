/**
 * Contrat d'accès aux données.
 *
 * L'application ne connaît QUE cette interface. Deux implémentations la
 * remplissent (cf. ADR-0006) : une locale (IndexedDB) et une Supabase.
 * Aucun composant, aucun store ne doit connaître l'implémentation active.
 */

import type {
  Household,
  HouseholdInvite,
  HouseholdMember,
  MemberRole,
  Product,
  Recipe,
  RecipeDetail,
  ShoppingItem,
  ShoppingList,
  Uuid,
  WeekPlan,
  WeekPlanRecipe,
} from '../domain/models';
import type { CategoryId } from '../domain/categories';
import type { UnitId } from '../domain/quantities';
import type { ItemMutation } from '../domain/shopping-list';

export interface AuthUser {
  id: Uuid;
  email: string;
  displayName: string;
}

export interface AuthGateway {
  currentUser(): Promise<AuthUser | null>;
  signUp(email: string, password: string, displayName: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export interface HouseholdGateway {
  /** Le foyer de l'utilisateur connecté, ou `null` s'il n'en a pas encore. */
  current(userId: Uuid): Promise<Household | null>;
  create(name: string, user: AuthUser): Promise<Household>;
  rename(householdId: Uuid, name: string): Promise<Household>;
  members(householdId: Uuid): Promise<HouseholdMember[]>;
  removeMember(householdId: Uuid, userId: Uuid): Promise<void>;
  createInvite(householdId: Uuid, createdBy: Uuid): Promise<HouseholdInvite>;
  activeInvites(householdId: Uuid): Promise<HouseholdInvite[]>;
  revokeInvite(inviteId: Uuid): Promise<void>;
  /** Lecture publique d'une invitation par son code, avant même d'avoir un compte. */
  findInvite(code: string): Promise<{ invite: HouseholdInvite; household: Household } | null>;
  acceptInvite(code: string, user: AuthUser): Promise<Household>;
}

export interface ProductInput {
  name: string;
  category: CategoryId;
  defaultUnit: UnitId | null;
}

export interface ProductGateway {
  list(householdId: Uuid): Promise<Product[]>;
  create(householdId: Uuid, input: ProductInput): Promise<Product>;
  update(productId: Uuid, changes: Partial<ProductInput>): Promise<Product>;
  /** Récupère le produit portant ce nom, ou le crée. C'est ce qui rend l'ajout instantané. */
  findOrCreate(householdId: Uuid, name: string, defaultUnit?: UnitId | null): Promise<Product>;
}

export interface RecipeInput {
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  source: string | null;
  tags: string[];
  photoPath: string | null;
  ingredients: Array<{ productId: Uuid; quantity: number | null; unit: UnitId | null; note: string | null }>;
  steps: string[];
  utensils: string[];
}

export interface RecipeGateway {
  list(householdId: Uuid): Promise<Recipe[]>;
  detail(recipeId: Uuid): Promise<RecipeDetail | null>;
  create(householdId: Uuid, userId: Uuid, input: RecipeInput): Promise<RecipeDetail>;
  update(recipeId: Uuid, input: RecipeInput): Promise<RecipeDetail>;
  remove(recipeId: Uuid): Promise<void>;
}

export interface WeekGateway {
  activePlan(householdId: Uuid): Promise<WeekPlan>;
  plannedRecipes(weekPlanId: Uuid): Promise<WeekPlanRecipe[]>;
  addRecipe(weekPlanId: Uuid, recipeId: Uuid, servings: number): Promise<WeekPlanRecipe>;
  updateServings(weekPlanRecipeId: Uuid, servings: number): Promise<WeekPlanRecipe>;
  removeRecipe(weekPlanRecipeId: Uuid): Promise<void>;
  /** Archive la semaine en cours et en ouvre une vide. */
  archive(householdId: Uuid): Promise<WeekPlan>;
}

export interface ShoppingGateway {
  activeList(householdId: Uuid): Promise<ShoppingList>;
  items(shoppingListId: Uuid): Promise<ShoppingItem[]>;
  /** Applique un lot de mutations calculé par le domaine. */
  apply(mutations: readonly ItemMutation[]): Promise<void>;
  /**
   * Prévient quand la liste change ailleurs — autre membre, autre appareil,
   * autre onglet. Retourne la fonction qui coupe l'écoute.
   *
   * Sans cela, deux téléphones ouverts dans le même magasin travaillent chacun
   * sur une photo périmée de la liste : c'est la promesse « partagée » qui tombe.
   */
  watch(shoppingListId: Uuid, onChange: () => void): () => void;
  /** Archive la liste courante et en ouvre une vide. */
  close(householdId: Uuid): Promise<ShoppingList>;
  archivedLists(householdId: Uuid): Promise<ShoppingList[]>;
}

export interface PhotoGateway {
  upload(householdId: Uuid, recipeId: Uuid, file: Blob): Promise<string>;
  /** URL affichable (objet local ou URL signée). */
  url(path: string): Promise<string | null>;
  remove(path: string): Promise<void>;
}

export interface Backend {
  readonly kind: 'local' | 'supabase';
  readonly auth: AuthGateway;
  readonly households: HouseholdGateway;
  readonly products: ProductGateway;
  readonly recipes: RecipeGateway;
  readonly week: WeekGateway;
  readonly shopping: ShoppingGateway;
  readonly photos: PhotoGateway;
}

export type { MemberRole, ItemMutation };
