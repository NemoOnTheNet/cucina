/**
 * Implémentation locale du backend, sur IndexedDB.
 *
 * Elle rend l'application entièrement utilisable sans aucun service distant
 * (cf. ADR-0006). Les données ne quittent pas l'appareil : le partage entre
 * membres d'un foyer n'existe donc que dans l'implémentation Supabase.
 */

import { newId, newInviteCode, nowIso } from '../../core/ids';
import { guessCategory } from '../../domain/categories';
import type {
  Household,
  HouseholdInvite,
  HouseholdMember,
  Product,
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeStep,
  RecipeUtensil,
  ShoppingItem,
  ShoppingItemSource,
  ShoppingList,
  Uuid,
  WeekPlan,
  WeekPlanRecipe,
} from '../../domain/models';
import type { UnitId } from '../../domain/quantities';
import type { ItemMutation } from '../../domain/shopping-list';
import type {
  AuthGateway,
  AuthUser,
  Backend,
  HouseholdGateway,
  PhotoGateway,
  ProductGateway,
  ProductInput,
  RecipeGateway,
  RecipeInput,
  ShoppingGateway,
  WeekGateway,
} from '../backend';
import * as idb from '../idb';

const INVITE_LIFETIME_DAYS = 7;
const SESSION_KEY = 'current';

interface StoredUser {
  id: Uuid;
  email: string;
  displayName: string;
  passwordHash: string;
}

interface StoredSession {
  id: string;
  userId: Uuid;
}

interface StoredPhoto {
  id: string;
  blob: Blob;
}

/** Le mot de passe n'est jamais stocké en clair, même dans une base locale. */
async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`cucina:${email.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position;
}

export class LocalAuth implements AuthGateway {
  async currentUser(): Promise<AuthUser | null> {
    const session = await idb.getOne<StoredSession>('session', SESSION_KEY);
    if (!session) return null;
    const user = await idb.getOne<StoredUser>('users', session.userId);
    return user ? { id: user.id, email: user.email, displayName: user.displayName } : null;
  }

  async signUp(email: string, password: string, displayName: string): Promise<AuthUser> {
    const normalized = normalizeEmail(email);
    const existing = await idb.findWhere<StoredUser>('users', (u) => u.email === normalized);
    if (existing.length > 0) {
      throw new Error('Un compte existe déjà avec cette adresse e-mail.');
    }
    const user: StoredUser = {
      id: newId(),
      email: normalized,
      displayName: displayName.trim() || normalized.split('@')[0],
      passwordHash: await hashPassword(normalized, password),
    };
    await idb.put('users', user);
    await idb.put<StoredSession>('session', { id: SESSION_KEY, userId: user.id });
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const normalized = normalizeEmail(email);
    const [user] = await idb.findWhere<StoredUser>('users', (u) => u.email === normalized);
    if (!user || user.passwordHash !== (await hashPassword(normalized, password))) {
      throw new Error('E-mail ou mot de passe incorrect.');
    }
    await idb.put<StoredSession>('session', { id: SESSION_KEY, userId: user.id });
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async signOut(): Promise<void> {
    await idb.remove('session', SESSION_KEY);
  }
}

export class LocalHouseholds implements HouseholdGateway {
  async current(userId: Uuid): Promise<Household | null> {
    const [membership] = await idb.findWhere<HouseholdMember & idb.Keyed>('members', (m) => m.userId === userId);
    if (!membership) return null;
    return idb.getOne<Household>('households', membership.householdId);
  }

  async create(name: string, user: AuthUser): Promise<Household> {
    const household: Household = {
      id: newId(),
      name: name.trim() || 'Mon foyer',
      ownerId: user.id,
      createdAt: nowIso(),
    };
    await idb.put('households', household);
    await this.addMember(household.id, user, 'owner');
    return household;
  }

  async rename(householdId: Uuid, name: string): Promise<Household> {
    const household = await idb.getOne<Household>('households', householdId);
    if (!household) throw new Error('Foyer introuvable.');
    const updated = { ...household, name: name.trim() || household.name };
    await idb.put('households', updated);
    return updated;
  }

  async members(householdId: Uuid): Promise<HouseholdMember[]> {
    const rows = await idb.findWhere<HouseholdMember & idb.Keyed>('members', (m) => m.householdId === householdId);
    return rows.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  async removeMember(householdId: Uuid, userId: Uuid): Promise<void> {
    await idb.removeWhere<HouseholdMember & idb.Keyed>(
      'members',
      (m) => m.householdId === householdId && m.userId === userId,
    );
  }

  async createInvite(householdId: Uuid, createdBy: Uuid): Promise<HouseholdInvite> {
    const expires = new Date();
    expires.setDate(expires.getDate() + INVITE_LIFETIME_DAYS);
    const invite: HouseholdInvite = {
      id: newId(),
      householdId,
      code: newInviteCode(),
      createdBy,
      expiresAt: expires.toISOString(),
      acceptedBy: null,
      acceptedAt: null,
    };
    await idb.put('invites', invite);
    return invite;
  }

  async activeInvites(householdId: Uuid): Promise<HouseholdInvite[]> {
    const now = nowIso();
    return idb.findWhere<HouseholdInvite & idb.Keyed>(
      'invites',
      (i) => i.householdId === householdId && i.acceptedBy === null && i.expiresAt > now,
    );
  }

  async revokeInvite(inviteId: Uuid): Promise<void> {
    await idb.remove('invites', inviteId);
  }

  async findInvite(code: string): Promise<{ invite: HouseholdInvite; household: Household } | null> {
    const wanted = code.trim().toUpperCase();
    const [invite] = await idb.findWhere<HouseholdInvite & idb.Keyed>('invites', (i) => i.code === wanted);
    if (!invite) return null;
    const household = await idb.getOne<Household>('households', invite.householdId);
    return household ? { invite, household } : null;
  }

  async acceptInvite(code: string, user: AuthUser): Promise<Household> {
    const found = await this.findInvite(code);
    if (!found) throw new Error("Ce code d'invitation n'existe pas.");
    if (found.invite.acceptedBy !== null) throw new Error('Cette invitation a déjà été utilisée.');
    if (found.invite.expiresAt <= nowIso()) throw new Error('Cette invitation a expiré.');

    const existing = await this.current(user.id);
    if (existing) {
      throw new Error("Tu appartiens déjà à un foyer. Un compte ne peut être rattaché qu'à un seul foyer.");
    }

    await this.addMember(found.household.id, user, 'member');
    await idb.put<HouseholdInvite & idb.Keyed>('invites', {
      ...found.invite,
      acceptedBy: user.id,
      acceptedAt: nowIso(),
    });
    return found.household;
  }

  private async addMember(householdId: Uuid, user: AuthUser, role: 'owner' | 'member'): Promise<void> {
    await idb.put<HouseholdMember & idb.Keyed>('members', {
      id: `${householdId}:${user.id}`,
      householdId,
      userId: user.id,
      role,
      displayName: user.displayName,
      joinedAt: nowIso(),
    });
  }
}

export class LocalProducts implements ProductGateway {
  async list(householdId: Uuid): Promise<Product[]> {
    const rows = await idb.findWhere<Product & idb.Keyed>('products', (p) => p.householdId === householdId);
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  async create(householdId: Uuid, input: ProductInput): Promise<Product> {
    const product: Product = {
      id: newId(),
      householdId,
      name: input.name.trim(),
      category: input.category,
      defaultUnit: input.defaultUnit,
      createdAt: nowIso(),
    };
    await idb.put('products', product);
    return product;
  }

  async update(productId: Uuid, changes: Partial<ProductInput>): Promise<Product> {
    const product = await idb.getOne<Product>('products', productId);
    if (!product) throw new Error('Produit introuvable.');
    const updated: Product = {
      ...product,
      name: changes.name?.trim() ?? product.name,
      category: changes.category ?? product.category,
      defaultUnit: changes.defaultUnit === undefined ? product.defaultUnit : changes.defaultUnit,
    };
    await idb.put('products', updated);
    return updated;
  }

  async findOrCreate(householdId: Uuid, name: string, defaultUnit: UnitId | null = null): Promise<Product> {
    const wanted = normalizeName(name);
    const [existing] = await idb.findWhere<Product & idb.Keyed>(
      'products',
      (p) => p.householdId === householdId && normalizeName(p.name) === wanted,
    );
    if (existing) return existing;
    return this.create(householdId, {
      name: name.trim(),
      category: guessCategory(name),
      defaultUnit,
    });
  }
}

export class LocalRecipes implements RecipeGateway {
  async list(householdId: Uuid): Promise<Recipe[]> {
    const rows = await idb.findWhere<Recipe & idb.Keyed>('recipes', (r) => r.householdId === householdId);
    return rows.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }

  async detail(recipeId: Uuid): Promise<RecipeDetail | null> {
    const recipe = await idb.getOne<Recipe>('recipes', recipeId);
    if (!recipe) return null;
    const [ingredients, steps, utensils] = await Promise.all([
      idb.findWhere<RecipeIngredient & idb.Keyed>('ingredients', (i) => i.recipeId === recipeId),
      idb.findWhere<RecipeStep & idb.Keyed>('steps', (s) => s.recipeId === recipeId),
      idb.findWhere<RecipeUtensil & idb.Keyed>('utensils', (u) => u.recipeId === recipeId),
    ]);
    return {
      ...recipe,
      ingredients: ingredients.sort(byPosition),
      steps: steps.sort(byPosition),
      utensils: utensils.sort(byPosition),
    };
  }

  async create(householdId: Uuid, userId: Uuid, input: RecipeInput): Promise<RecipeDetail> {
    void userId;
    const recipe: Recipe = {
      id: newId(),
      householdId,
      title: input.title.trim(),
      description: input.description,
      photoPath: input.photoPath,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      source: input.source,
      tags: input.tags,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await idb.put('recipes', recipe);
    await this.writeChildren(recipe.id, input);
    const detail = await this.detail(recipe.id);
    if (!detail) throw new Error('Recette introuvable après création.');
    return detail;
  }

  async update(recipeId: Uuid, input: RecipeInput): Promise<RecipeDetail> {
    const recipe = await idb.getOne<Recipe>('recipes', recipeId);
    if (!recipe) throw new Error('Recette introuvable.');
    const updated: Recipe = {
      ...recipe,
      title: input.title.trim(),
      description: input.description,
      photoPath: input.photoPath,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      source: input.source,
      tags: input.tags,
      updatedAt: nowIso(),
    };
    await idb.put('recipes', updated);
    await this.clearChildren(recipeId);
    await this.writeChildren(recipeId, input);
    const detail = await this.detail(recipeId);
    if (!detail) throw new Error('Recette introuvable après mise à jour.');
    return detail;
  }

  async remove(recipeId: Uuid): Promise<void> {
    await this.clearChildren(recipeId);
    await idb.remove('recipes', recipeId);
  }

  private async writeChildren(recipeId: Uuid, input: RecipeInput): Promise<void> {
    await idb.putMany<RecipeIngredient & idb.Keyed>(
      'ingredients',
      input.ingredients.map((ingredient, position) => ({
        id: newId(),
        recipeId,
        productId: ingredient.productId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        note: ingredient.note,
        position,
      })),
    );
    await idb.putMany<RecipeStep & idb.Keyed>(
      'steps',
      input.steps.map((text, position) => ({ id: newId(), recipeId, position, text })),
    );
    await idb.putMany<RecipeUtensil & idb.Keyed>(
      'utensils',
      input.utensils.map((name, position) => ({ id: newId(), recipeId, name, position })),
    );
  }

  private async clearChildren(recipeId: Uuid): Promise<void> {
    await idb.removeWhere<RecipeIngredient & idb.Keyed>('ingredients', (i) => i.recipeId === recipeId);
    await idb.removeWhere<RecipeStep & idb.Keyed>('steps', (s) => s.recipeId === recipeId);
    await idb.removeWhere<RecipeUtensil & idb.Keyed>('utensils', (u) => u.recipeId === recipeId);
  }
}

export class LocalWeek implements WeekGateway {
  async activePlan(householdId: Uuid): Promise<WeekPlan> {
    const [existing] = await idb.findWhere<WeekPlan & idb.Keyed>(
      'week_plans',
      (p) => p.householdId === householdId && p.status === 'active',
    );
    if (existing) return existing;
    const plan: WeekPlan = {
      id: newId(),
      householdId,
      status: 'active',
      startedAt: nowIso(),
      archivedAt: null,
    };
    await idb.put('week_plans', plan);
    return plan;
  }

  async plannedRecipes(weekPlanId: Uuid): Promise<WeekPlanRecipe[]> {
    const rows = await idb.findWhere<WeekPlanRecipe & idb.Keyed>(
      'week_plan_recipes',
      (r) => r.weekPlanId === weekPlanId,
    );
    return rows.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  }

  async addRecipe(weekPlanId: Uuid, recipeId: Uuid, servings: number): Promise<WeekPlanRecipe> {
    const planned: WeekPlanRecipe = {
      id: newId(),
      weekPlanId,
      recipeId,
      servings,
      addedAt: nowIso(),
    };
    await idb.put('week_plan_recipes', planned);
    return planned;
  }

  async updateServings(weekPlanRecipeId: Uuid, servings: number): Promise<WeekPlanRecipe> {
    const planned = await idb.getOne<WeekPlanRecipe>('week_plan_recipes', weekPlanRecipeId);
    if (!planned) throw new Error('Recette planifiée introuvable.');
    const updated = { ...planned, servings };
    await idb.put('week_plan_recipes', updated);
    return updated;
  }

  async removeRecipe(weekPlanRecipeId: Uuid): Promise<void> {
    await idb.remove('week_plan_recipes', weekPlanRecipeId);
  }

  async archive(householdId: Uuid): Promise<WeekPlan> {
    const current = await this.activePlan(householdId);
    await idb.put<WeekPlan & idb.Keyed>('week_plans', {
      ...current,
      status: 'archived',
      archivedAt: nowIso(),
    });
    const next: WeekPlan = {
      id: newId(),
      householdId,
      status: 'active',
      startedAt: nowIso(),
      archivedAt: null,
    };
    await idb.put('week_plans', next);
    return next;
  }
}

export class LocalShopping implements ShoppingGateway {
  async activeList(householdId: Uuid): Promise<ShoppingList> {
    const [existing] = await idb.findWhere<ShoppingList & idb.Keyed>(
      'shopping_lists',
      (l) => l.householdId === householdId && l.status === 'active',
    );
    if (existing) return existing;
    const list: ShoppingList = {
      id: newId(),
      householdId,
      status: 'active',
      createdAt: nowIso(),
      closedAt: null,
    };
    await idb.put('shopping_lists', list);
    return list;
  }

  async items(shoppingListId: Uuid): Promise<ShoppingItem[]> {
    const [items, sources] = await Promise.all([
      idb.findWhere<ShoppingItem & idb.Keyed>('shopping_items', (i) => i.shoppingListId === shoppingListId),
      idb.getAll<ShoppingItemSource & idb.Keyed>('shopping_item_sources'),
    ]);
    const byItem = new Map<Uuid, ShoppingItemSource[]>();
    for (const source of sources) {
      const bucket = byItem.get(source.shoppingItemId) ?? [];
      bucket.push(source);
      byItem.set(source.shoppingItemId, bucket);
    }
    return items.map((item) => ({ ...item, sources: byItem.get(item.id) ?? [] }));
  }

  async apply(mutations: readonly ItemMutation[]): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.kind === 'delete') {
        await idb.removeWhere<ShoppingItemSource & idb.Keyed>(
          'shopping_item_sources',
          (s) => s.shoppingItemId === mutation.itemId,
        );
        await idb.remove('shopping_items', mutation.itemId);
        continue;
      }
      const { sources, ...row } = mutation.item;
      await idb.put<Omit<ShoppingItem, 'sources'> & idb.Keyed>('shopping_items', row);
      await idb.removeWhere<ShoppingItemSource & idb.Keyed>(
        'shopping_item_sources',
        (s) => s.shoppingItemId === mutation.item.id,
      );
      await idb.putMany<ShoppingItemSource & idb.Keyed>('shopping_item_sources', sources);
    }
  }

  async close(householdId: Uuid): Promise<ShoppingList> {
    const current = await this.activeList(householdId);
    await idb.put<ShoppingList & idb.Keyed>('shopping_lists', {
      ...current,
      status: 'archived',
      closedAt: nowIso(),
    });
    const next: ShoppingList = {
      id: newId(),
      householdId,
      status: 'active',
      createdAt: nowIso(),
      closedAt: null,
    };
    await idb.put('shopping_lists', next);
    return next;
  }

  async archivedLists(householdId: Uuid): Promise<ShoppingList[]> {
    const rows = await idb.findWhere<ShoppingList & idb.Keyed>(
      'shopping_lists',
      (l) => l.householdId === householdId && l.status === 'archived',
    );
    return rows.sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  }
}

export class LocalPhotos implements PhotoGateway {
  private readonly urls = new Map<string, string>();

  async upload(householdId: Uuid, recipeId: Uuid, file: Blob): Promise<string> {
    const path = `${householdId}/${recipeId}`;
    await idb.put<StoredPhoto>('photos', { id: path, blob: file });
    this.revoke(path);
    return path;
  }

  async url(path: string): Promise<string | null> {
    const cached = this.urls.get(path);
    if (cached) return cached;
    const stored = await idb.getOne<StoredPhoto>('photos', path);
    if (!stored) return null;
    const url = URL.createObjectURL(stored.blob);
    this.urls.set(path, url);
    return url;
  }

  async remove(path: string): Promise<void> {
    this.revoke(path);
    await idb.remove('photos', path);
  }

  private revoke(path: string): void {
    const url = this.urls.get(path);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(path);
    }
  }
}

export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  readonly auth = new LocalAuth();
  readonly households = new LocalHouseholds();
  readonly products = new LocalProducts();
  readonly recipes = new LocalRecipes();
  readonly week = new LocalWeek();
  readonly shopping = new LocalShopping();
  readonly photos = new LocalPhotos();
}
