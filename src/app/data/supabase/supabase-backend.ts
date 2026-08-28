/**
 * Implémentation Supabase du backend.
 *
 * Miroir strict de l'implémentation locale : mêmes gateways, mêmes signatures.
 * Le schéma correspondant est dans supabase/migrations/.
 *
 * ⚠️ Cette implémentation n'est active que si `supabaseUrl` et `supabaseAnonKey`
 * sont renseignés dans la configuration (cf. core/config.ts).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { newInviteCode, nowIso } from '../../core/ids';
import { guessCategory, toCategoryId } from '../../domain/categories';
import type {
  Household,
  HouseholdInvite,
  HouseholdMember,
  MemberRole,
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
import { toUnitId, type UnitId } from '../../domain/quantities';
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

const INVITE_LIFETIME_DAYS = 7;
const PHOTO_BUCKET = 'recipe-photos';

type Row = Record<string, unknown>;

/** Toute erreur Supabase devient une erreur lisible par un humain. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context} : ${result.error.message}`);
  if (result.data === null) throw new Error(`${context} : réponse vide.`);
  return result.data;
}

function str(row: Row, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function nullableStr(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function num(row: Row, key: string, fallback: number): number {
  const value = row[key];
  return typeof value === 'number' ? value : fallback;
}

function nullableNum(row: Row, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return null;
}

function bool(row: Row, key: string): boolean {
  return row[key] === true;
}

function toHousehold(row: Row): Household {
  return {
    id: str(row, 'id'),
    name: str(row, 'name'),
    ownerId: str(row, 'owner_id'),
    createdAt: str(row, 'created_at'),
  };
}

function toMember(row: Row): HouseholdMember {
  const role = str(row, 'role');
  return {
    householdId: str(row, 'household_id'),
    userId: str(row, 'user_id'),
    role: (role === 'owner' ? 'owner' : 'member') satisfies MemberRole,
    displayName: str(row, 'display_name'),
    joinedAt: str(row, 'joined_at'),
  };
}

function toInvite(row: Row): HouseholdInvite {
  return {
    id: str(row, 'id'),
    householdId: str(row, 'household_id'),
    code: str(row, 'code'),
    createdBy: str(row, 'created_by'),
    expiresAt: str(row, 'expires_at'),
    acceptedBy: nullableStr(row, 'accepted_by'),
    acceptedAt: nullableStr(row, 'accepted_at'),
  };
}

function toProduct(row: Row): Product {
  return {
    id: str(row, 'id'),
    householdId: str(row, 'household_id'),
    name: str(row, 'name'),
    category: toCategoryId(str(row, 'category')),
    defaultUnit: toUnitId(nullableStr(row, 'default_unit')),
    createdAt: str(row, 'created_at'),
  };
}

function toRecipe(row: Row): Recipe {
  const tags = row['tags'];
  return {
    id: str(row, 'id'),
    householdId: str(row, 'household_id'),
    title: str(row, 'title'),
    description: nullableStr(row, 'description'),
    photoPath: nullableStr(row, 'photo_path'),
    servings: num(row, 'servings', 4),
    prepMinutes: nullableNum(row, 'prep_minutes'),
    cookMinutes: nullableNum(row, 'cook_minutes'),
    source: nullableStr(row, 'source'),
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
  };
}

function toIngredient(row: Row): RecipeIngredient {
  return {
    id: str(row, 'id'),
    recipeId: str(row, 'recipe_id'),
    productId: str(row, 'product_id'),
    quantity: nullableNum(row, 'quantity'),
    unit: toUnitId(nullableStr(row, 'unit')),
    note: nullableStr(row, 'note'),
    position: num(row, 'position', 0),
  };
}

function toStep(row: Row): RecipeStep {
  return {
    id: str(row, 'id'),
    recipeId: str(row, 'recipe_id'),
    position: num(row, 'position', 0),
    text: str(row, 'text'),
  };
}

function toUtensil(row: Row): RecipeUtensil {
  return {
    id: str(row, 'id'),
    recipeId: str(row, 'recipe_id'),
    name: str(row, 'name'),
    position: num(row, 'position', 0),
  };
}

function toWeekPlan(row: Row): WeekPlan {
  return {
    id: str(row, 'id'),
    householdId: str(row, 'household_id'),
    status: str(row, 'status') === 'archived' ? 'archived' : 'active',
    startedAt: str(row, 'started_at'),
    archivedAt: nullableStr(row, 'archived_at'),
  };
}

function toWeekPlanRecipe(row: Row): WeekPlanRecipe {
  return {
    id: str(row, 'id'),
    weekPlanId: str(row, 'week_plan_id'),
    recipeId: str(row, 'recipe_id'),
    servings: num(row, 'servings', 4),
    addedAt: str(row, 'added_at'),
  };
}

function toShoppingList(row: Row): ShoppingList {
  return {
    id: str(row, 'id'),
    householdId: str(row, 'household_id'),
    status: str(row, 'status') === 'archived' ? 'archived' : 'active',
    createdAt: str(row, 'created_at'),
    closedAt: nullableStr(row, 'closed_at'),
  };
}

function toSource(row: Row): ShoppingItemSource {
  return {
    id: str(row, 'id'),
    shoppingItemId: str(row, 'shopping_item_id'),
    weekPlanRecipeId: str(row, 'week_plan_recipe_id'),
    quantity: nullableNum(row, 'quantity'),
  };
}

function toShoppingItem(row: Row): ShoppingItem {
  return {
    id: str(row, 'id'),
    shoppingListId: str(row, 'shopping_list_id'),
    productId: str(row, 'product_id'),
    unit: toUnitId(nullableStr(row, 'unit')),
    quantity: nullableNum(row, 'quantity'),
    manualQuantity: nullableNum(row, 'manual_quantity'),
    addedManually: bool(row, 'added_manually'),
    checked: bool(row, 'checked'),
    checkedAt: nullableStr(row, 'checked_at'),
    note: nullableStr(row, 'note'),
    sources: [],
  };
}

class SupabaseAuth implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async currentUser(): Promise<AuthUser | null> {
    const { data } = await this.client.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const metadata = user.user_metadata as Row;
    return {
      id: user.id,
      email: user.email ?? '',
      displayName: str(metadata, 'display_name') || (user.email ?? '').split('@')[0],
    };
  }

  async signUp(email: string, password: string, displayName: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw new Error(error.message);
    const user = data.user;
    if (!user) throw new Error('Compte créé, mais session indisponible. Vérifie ta boîte mail.');
    return { id: user.id, email: user.email ?? email, displayName: displayName.trim() };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('E-mail ou mot de passe incorrect.');
    const metadata = data.user.user_metadata as Row;
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      displayName: str(metadata, 'display_name') || email.split('@')[0],
    };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }
}

class SupabaseHouseholds implements HouseholdGateway {
  constructor(private readonly client: SupabaseClient) {}

  async current(userId: Uuid): Promise<Household | null> {
    const membership = await this.client
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    const householdId = membership.data ? str(membership.data as Row, 'household_id') : '';
    if (!householdId) return null;
    const household = await this.client.from('households').select('*').eq('id', householdId).maybeSingle();
    if (household.error) throw new Error(household.error.message);
    return household.data ? toHousehold(household.data as Row) : null;
  }

  async create(name: string, user: AuthUser): Promise<Household> {
    const id = unwrap(
      await this.client.rpc('create_household', { household_name: name, member_name: user.displayName }),
      'Création du foyer',
    ) as string;
    const household = await this.client.from('households').select('*').eq('id', id).single();
    return toHousehold(unwrap(household, 'Lecture du foyer') as Row);
  }

  async rename(householdId: Uuid, name: string): Promise<Household> {
    const result = await this.client
      .from('households')
      .update({ name: name.trim() })
      .eq('id', householdId)
      .select()
      .single();
    return toHousehold(unwrap(result, 'Renommage du foyer') as Row);
  }

  async members(householdId: Uuid): Promise<HouseholdMember[]> {
    const result = await this.client
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .order('joined_at');
    return (unwrap(result, 'Lecture des membres') as Row[]).map(toMember);
  }

  async removeMember(householdId: Uuid, userId: Uuid): Promise<void> {
    const { error } = await this.client
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  async createInvite(householdId: Uuid, createdBy: Uuid): Promise<HouseholdInvite> {
    const expires = new Date();
    expires.setDate(expires.getDate() + INVITE_LIFETIME_DAYS);
    const result = await this.client
      .from('household_invites')
      .insert({
        household_id: householdId,
        code: newInviteCode(),
        created_by: createdBy,
        expires_at: expires.toISOString(),
      })
      .select()
      .single();
    return toInvite(unwrap(result, "Création de l'invitation") as Row);
  }

  async activeInvites(householdId: Uuid): Promise<HouseholdInvite[]> {
    const result = await this.client
      .from('household_invites')
      .select('*')
      .eq('household_id', householdId)
      .is('accepted_by', null)
      .gt('expires_at', nowIso());
    return (unwrap(result, 'Lecture des invitations') as Row[]).map(toInvite);
  }

  async revokeInvite(inviteId: Uuid): Promise<void> {
    const { error } = await this.client.from('household_invites').delete().eq('id', inviteId);
    if (error) throw new Error(error.message);
  }

  async findInvite(code: string): Promise<{ invite: HouseholdInvite; household: Household } | null> {
    const result = await this.client.rpc('invite_preview', { invite_code: code });
    if (result.error) throw new Error(result.error.message);
    const rows = (result.data ?? []) as Row[];
    const row = rows[0];
    if (!row) return null;
    const household: Household = {
      id: str(row, 'household_id'),
      name: str(row, 'household_name'),
      ownerId: '',
      createdAt: '',
    };
    const invite: HouseholdInvite = {
      id: '',
      householdId: household.id,
      code: code.trim().toUpperCase(),
      createdBy: '',
      expiresAt: str(row, 'expires_at'),
      acceptedBy: bool(row, 'already_used') ? 'used' : null,
      acceptedAt: null,
    };
    return { invite, household };
  }

  async acceptInvite(code: string, user: AuthUser): Promise<Household> {
    const householdId = unwrap(
      await this.client.rpc('accept_invite', { invite_code: code, member_name: user.displayName }),
      "Acceptation de l'invitation",
    ) as string;
    const household = await this.client.from('households').select('*').eq('id', householdId).single();
    return toHousehold(unwrap(household, 'Lecture du foyer') as Row);
  }
}

class SupabaseProducts implements ProductGateway {
  constructor(private readonly client: SupabaseClient) {}

  async list(householdId: Uuid): Promise<Product[]> {
    const result = await this.client.from('products').select('*').eq('household_id', householdId).order('name');
    return (unwrap(result, 'Lecture du catalogue') as Row[]).map(toProduct);
  }

  async create(householdId: Uuid, input: ProductInput): Promise<Product> {
    const result = await this.client
      .from('products')
      .insert({
        household_id: householdId,
        name: input.name.trim(),
        category: input.category,
        default_unit: input.defaultUnit,
      })
      .select()
      .single();
    return toProduct(unwrap(result, 'Création du produit') as Row);
  }

  async update(productId: Uuid, changes: Partial<ProductInput>): Promise<Product> {
    const patch: Row = {};
    if (changes.name !== undefined) patch['name'] = changes.name.trim();
    if (changes.category !== undefined) patch['category'] = changes.category;
    if (changes.defaultUnit !== undefined) patch['default_unit'] = changes.defaultUnit;
    const result = await this.client.from('products').update(patch).eq('id', productId).select().single();
    return toProduct(unwrap(result, 'Mise à jour du produit') as Row);
  }

  async findOrCreate(householdId: Uuid, name: string, defaultUnit: UnitId | null = null): Promise<Product> {
    const existing = await this.client
      .from('products')
      .select('*')
      .eq('household_id', householdId)
      .ilike('name', name.trim())
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return toProduct(existing.data as Row);
    return this.create(householdId, { name, category: guessCategory(name), defaultUnit });
  }
}

class SupabaseRecipes implements RecipeGateway {
  constructor(private readonly client: SupabaseClient) {}

  async list(householdId: Uuid): Promise<Recipe[]> {
    const result = await this.client.from('recipes').select('*').eq('household_id', householdId).order('title');
    return (unwrap(result, 'Lecture des recettes') as Row[]).map(toRecipe);
  }

  async detail(recipeId: Uuid): Promise<RecipeDetail | null> {
    const recipe = await this.client.from('recipes').select('*').eq('id', recipeId).maybeSingle();
    if (recipe.error) throw new Error(recipe.error.message);
    if (!recipe.data) return null;

    const [ingredients, steps, utensils] = await Promise.all([
      this.client.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('position'),
      this.client.from('recipe_steps').select('*').eq('recipe_id', recipeId).order('position'),
      this.client.from('recipe_utensils').select('*').eq('recipe_id', recipeId).order('position'),
    ]);

    return {
      ...toRecipe(recipe.data as Row),
      ingredients: (unwrap(ingredients, 'Lecture des ingrédients') as Row[]).map(toIngredient),
      steps: (unwrap(steps, 'Lecture des étapes') as Row[]).map(toStep),
      utensils: (unwrap(utensils, 'Lecture des ustensiles') as Row[]).map(toUtensil),
    };
  }

  async create(householdId: Uuid, userId: Uuid, input: RecipeInput): Promise<RecipeDetail> {
    const result = await this.client
      .from('recipes')
      .insert({ household_id: householdId, created_by: userId, ...recipeColumns(input) })
      .select()
      .single();
    const recipe = toRecipe(unwrap(result, 'Création de la recette') as Row);
    await this.writeChildren(recipe.id, input);
    const detail = await this.detail(recipe.id);
    if (!detail) throw new Error('Recette introuvable après création.');
    return detail;
  }

  async update(recipeId: Uuid, input: RecipeInput): Promise<RecipeDetail> {
    const result = await this.client
      .from('recipes')
      .update({ ...recipeColumns(input), updated_at: nowIso() })
      .eq('id', recipeId)
      .select()
      .single();
    unwrap(result, 'Mise à jour de la recette');
    await this.clearChildren(recipeId);
    await this.writeChildren(recipeId, input);
    const detail = await this.detail(recipeId);
    if (!detail) throw new Error('Recette introuvable après mise à jour.');
    return detail;
  }

  async remove(recipeId: Uuid): Promise<void> {
    const { error } = await this.client.from('recipes').delete().eq('id', recipeId);
    if (error) throw new Error(error.message);
  }

  private async writeChildren(recipeId: Uuid, input: RecipeInput): Promise<void> {
    if (input.ingredients.length > 0) {
      const { error } = await this.client.from('recipe_ingredients').insert(
        input.ingredients.map((ingredient, position) => ({
          recipe_id: recipeId,
          product_id: ingredient.productId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          note: ingredient.note,
          position,
        })),
      );
      if (error) throw new Error(error.message);
    }
    if (input.steps.length > 0) {
      const { error } = await this.client
        .from('recipe_steps')
        .insert(input.steps.map((text, position) => ({ recipe_id: recipeId, text, position })));
      if (error) throw new Error(error.message);
    }
    if (input.utensils.length > 0) {
      const { error } = await this.client
        .from('recipe_utensils')
        .insert(input.utensils.map((name, position) => ({ recipe_id: recipeId, name, position })));
      if (error) throw new Error(error.message);
    }
  }

  private async clearChildren(recipeId: Uuid): Promise<void> {
    await this.client.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    await this.client.from('recipe_steps').delete().eq('recipe_id', recipeId);
    await this.client.from('recipe_utensils').delete().eq('recipe_id', recipeId);
  }
}

function recipeColumns(input: RecipeInput): Row {
  return {
    title: input.title.trim(),
    description: input.description,
    photo_path: input.photoPath,
    servings: input.servings,
    prep_minutes: input.prepMinutes,
    cook_minutes: input.cookMinutes,
    source: input.source,
    tags: input.tags,
  };
}

class SupabaseWeek implements WeekGateway {
  constructor(private readonly client: SupabaseClient) {}

  async activePlan(householdId: Uuid): Promise<WeekPlan> {
    const existing = await this.client
      .from('week_plans')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return toWeekPlan(existing.data as Row);

    const created = await this.client
      .from('week_plans')
      .insert({ household_id: householdId, status: 'active' })
      .select()
      .single();
    return toWeekPlan(unwrap(created, 'Ouverture de la semaine') as Row);
  }

  async plannedRecipes(weekPlanId: Uuid): Promise<WeekPlanRecipe[]> {
    const result = await this.client
      .from('week_plan_recipes')
      .select('*')
      .eq('week_plan_id', weekPlanId)
      .order('added_at');
    return (unwrap(result, 'Lecture de la semaine') as Row[]).map(toWeekPlanRecipe);
  }

  async addRecipe(weekPlanId: Uuid, recipeId: Uuid, servings: number): Promise<WeekPlanRecipe> {
    const result = await this.client
      .from('week_plan_recipes')
      .insert({ week_plan_id: weekPlanId, recipe_id: recipeId, servings })
      .select()
      .single();
    return toWeekPlanRecipe(unwrap(result, 'Ajout à la semaine') as Row);
  }

  async updateServings(weekPlanRecipeId: Uuid, servings: number): Promise<WeekPlanRecipe> {
    const result = await this.client
      .from('week_plan_recipes')
      .update({ servings })
      .eq('id', weekPlanRecipeId)
      .select()
      .single();
    return toWeekPlanRecipe(unwrap(result, 'Mise à jour des portions') as Row);
  }

  async removeRecipe(weekPlanRecipeId: Uuid): Promise<void> {
    const { error } = await this.client.from('week_plan_recipes').delete().eq('id', weekPlanRecipeId);
    if (error) throw new Error(error.message);
  }

  async archive(householdId: Uuid): Promise<WeekPlan> {
    const current = await this.activePlan(householdId);
    const { error } = await this.client
      .from('week_plans')
      .update({ status: 'archived', archived_at: nowIso() })
      .eq('id', current.id);
    if (error) throw new Error(error.message);
    return this.activePlan(householdId);
  }
}

class SupabaseShopping implements ShoppingGateway {
  constructor(private readonly client: SupabaseClient) {}

  async activeList(householdId: Uuid): Promise<ShoppingList> {
    const existing = await this.client
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return toShoppingList(existing.data as Row);

    const created = await this.client
      .from('shopping_lists')
      .insert({ household_id: householdId, status: 'active' })
      .select()
      .single();
    return toShoppingList(unwrap(created, 'Ouverture de la liste') as Row);
  }

  async items(shoppingListId: Uuid): Promise<ShoppingItem[]> {
    const result = await this.client
      .from('shopping_items')
      .select('*, shopping_item_sources(*)')
      .eq('shopping_list_id', shoppingListId);
    return (unwrap(result, 'Lecture de la liste') as Row[]).map((row) => {
      const nested = row['shopping_item_sources'];
      const sources = Array.isArray(nested) ? nested.map((s) => toSource(s as Row)) : [];
      return { ...toShoppingItem(row), sources };
    });
  }

  async apply(mutations: readonly ItemMutation[]): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.kind === 'delete') {
        const { error } = await this.client.from('shopping_items').delete().eq('id', mutation.itemId);
        if (error) throw new Error(error.message);
        continue;
      }
      const item = mutation.item;
      const { error } = await this.client.from('shopping_items').upsert({
        id: item.id,
        shopping_list_id: item.shoppingListId,
        product_id: item.productId,
        unit: item.unit,
        quantity: item.quantity,
        manual_quantity: item.manualQuantity,
        added_manually: item.addedManually,
        checked: item.checked,
        checked_at: item.checkedAt,
        note: item.note,
      });
      if (error) throw new Error(error.message);

      await this.client.from('shopping_item_sources').delete().eq('shopping_item_id', item.id);
      if (item.sources.length > 0) {
        const { error: sourceError } = await this.client.from('shopping_item_sources').insert(
          item.sources.map((source) => ({
            id: source.id,
            shopping_item_id: item.id,
            week_plan_recipe_id: source.weekPlanRecipeId,
            quantity: source.quantity,
          })),
        );
        if (sourceError) throw new Error(sourceError.message);
      }
    }
  }

  async close(householdId: Uuid): Promise<ShoppingList> {
    const current = await this.activeList(householdId);
    const { error } = await this.client
      .from('shopping_lists')
      .update({ status: 'archived', closed_at: nowIso() })
      .eq('id', current.id);
    if (error) throw new Error(error.message);
    return this.activeList(householdId);
  }

  async archivedLists(householdId: Uuid): Promise<ShoppingList[]> {
    const result = await this.client
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'archived')
      .order('closed_at', { ascending: false });
    return (unwrap(result, 'Lecture des listes archivées') as Row[]).map(toShoppingList);
  }
}

class SupabasePhotos implements PhotoGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upload(householdId: Uuid, recipeId: Uuid, file: Blob): Promise<string> {
    const path = `${householdId}/${recipeId}.jpg`;
    const { error } = await this.client.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (error) throw new Error(error.message);
    return path;
  }

  async url(path: string): Promise<string | null> {
    const { data, error } = await this.client.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async remove(path: string): Promise<void> {
    await this.client.storage.from(PHOTO_BUCKET).remove([path]);
  }
}

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  readonly auth: AuthGateway;
  readonly households: HouseholdGateway;
  readonly products: ProductGateway;
  readonly recipes: RecipeGateway;
  readonly week: WeekGateway;
  readonly shopping: ShoppingGateway;
  readonly photos: PhotoGateway;

  constructor(url: string, anonKey: string) {
    const client = createClient(url, anonKey);
    this.auth = new SupabaseAuth(client);
    this.households = new SupabaseHouseholds(client);
    this.products = new SupabaseProducts(client);
    this.recipes = new SupabaseRecipes(client);
    this.week = new SupabaseWeek(client);
    this.shopping = new SupabaseShopping(client);
    this.photos = new SupabasePhotos(client);
  }
}
