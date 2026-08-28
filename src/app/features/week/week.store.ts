import { Injectable, computed, inject, signal } from '@angular/core';
import { BACKEND } from '../../core/backend.provider';
import { SessionStore } from '../../core/auth/session.store';
import { ToastStore } from '../../core/ui/toast.store';
import { needsFromPlannedRecipe } from '../../domain/shopping-list';
import { plural } from '../../shared/plural';
import type { Recipe, WeekPlan, WeekPlanRecipe } from '../../domain/models';
import { ShoppingStore } from '../shopping/shopping.store';

export interface PlannedEntry {
  readonly planned: WeekPlanRecipe;
  readonly recipe: Recipe | null;
}

/**
 * La semaine : un panier de recettes, sans jour ni repas (ADR-0003).
 *
 * C'est le store qui fait le lien avec la liste de courses. Ce couplage est
 * explicite et assumé (ADR-0004) plutôt que caché derrière un bus d'événements.
 */
@Injectable({ providedIn: 'root' })
export class WeekStore {
  private readonly backend = inject(BACKEND);
  private readonly session = inject(SessionStore);
  private readonly shopping = inject(ShoppingStore);
  private readonly toasts = inject(ToastStore);

  private readonly _plan = signal<WeekPlan | null>(null);
  private readonly _planned = signal<WeekPlanRecipe[]>([]);
  private readonly _recipes = signal<Recipe[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal(false);

  readonly plan = this._plan.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly recipes = this._recipes.asReadonly();

  readonly entries = computed<PlannedEntry[]>(() => {
    const byId = new Map(this._recipes().map((recipe) => [recipe.id, recipe]));
    return this._planned().map((planned) => ({ planned, recipe: byId.get(planned.recipeId) ?? null }));
  });

  readonly count = computed(() => this._planned().length);

  /** Recettes du foyer pas encore dans la semaine : ce qu'on peut encore ajouter. */
  readonly selectable = computed(() => {
    const already = new Set(this._planned().map((planned) => planned.recipeId));
    return this._recipes().filter((recipe) => !already.has(recipe.id));
  });

  isPlanned(recipeId: string): boolean {
    return this._planned().some((planned) => planned.recipeId === recipeId);
  }

  /** Charge la semaine si nécessaire : la fiche recette a besoin de savoir si
   * la recette y est déjà, même quand on y arrive par un lien direct. */
  async ensureLoaded(): Promise<void> {
    if (this._plan() === null) await this.load();
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const householdId = this.session.householdId();
      const plan = await this.backend.week.activePlan(householdId);
      this._plan.set(plan);
      const [planned, recipes] = await Promise.all([
        this.backend.week.plannedRecipes(plan.id),
        this.backend.recipes.list(householdId),
      ]);
      this._planned.set(planned);
      this._recipes.set(recipes);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Semaine indisponible.');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Ajoute une recette à la semaine et propage ses ingrédients dans la liste
   * (règles R1 et R2). Le retour indique ce qui a été créé et fusionné :
   * l'utilisateur doit voir l'effet de son geste.
   */
  async add(recipeId: string, servings: number): Promise<void> {
    if (this._busy()) return;
    this._busy.set(true);
    try {
      const plan = this._plan() ?? (await this.backend.week.activePlan(this.session.householdId()));
      this._plan.set(plan);

      const detail = await this.backend.recipes.detail(recipeId);
      if (!detail) throw new Error('Recette introuvable.');

      const planned = await this.backend.week.addRecipe(plan.id, recipeId, servings);
      this._planned.update((all) => [...all, planned]);

      const needs = needsFromPlannedRecipe(detail.ingredients, detail.servings, servings, planned.id);
      const { created, merged } = await this.shopping.applyNeeds(needs);

      this.toasts.success(summarize(detail.title, created, merged));
    } catch (error) {
      this.toasts.error(error);
      await this.load();
    } finally {
      this._busy.set(false);
    }
  }

  /** Retire une recette et nettoie la liste selon la règle R3. */
  async remove(planned: WeekPlanRecipe): Promise<void> {
    if (this._busy()) return;
    this._busy.set(true);
    try {
      // La liste d'abord : `removePlannedRecipe` lève désormais si rien n'a pu
      // être enregistré. Retirer la recette avant aurait laissé des lignes
      // rattachées à une recette disparue, avec un total figé pour toujours.
      const removed = await this.shopping.removePlannedRecipe(planned.id);
      await this.backend.week.removeRecipe(planned.id);
      this._planned.update((all) => all.filter((entry) => entry.id !== planned.id));
      this.toasts.show(
        removed === 0
          ? 'Recette retirée de la semaine.'
          : `Recette retirée · ${plural(removed, 'ligne')} ${removed > 1 ? 'enlevées' : 'enlevée'} de la liste.`,
      );
    } catch (error) {
      this.toasts.error(error);
      await this.load();
    } finally {
      this._busy.set(false);
    }
  }

  /** Change les portions d'une recette planifiée : on défait, puis on refait. */
  async setServings(planned: WeekPlanRecipe, servings: number): Promise<void> {
    if (this._busy() || servings === planned.servings || servings < 1) return;
    this._busy.set(true);
    try {
      const detail = await this.backend.recipes.detail(planned.recipeId);
      if (!detail) throw new Error('Recette introuvable.');

      await this.shopping.removePlannedRecipe(planned.id);
      const updated = await this.backend.week.updateServings(planned.id, servings);
      this._planned.update((all) => all.map((entry) => (entry.id === updated.id ? updated : entry)));

      const needs = needsFromPlannedRecipe(detail.ingredients, detail.servings, servings, planned.id);
      await this.shopping.applyNeeds(needs);
      this.toasts.success(`${detail.title} : ${servings} portions.`);
    } catch (error) {
      this.toasts.error(error);
      await this.load();
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Archive la semaine et en ouvre une vide.
   *
   * La liste de courses n'est PAS touchée : on archive souvent la semaine après
   * avoir fait les courses, et vider la liste à ce moment-là ferait disparaître
   * des articles déjà achetés.
   */
  async archive(): Promise<void> {
    try {
      const plan = await this.backend.week.archive(this.session.householdId());
      this._plan.set(plan);
      this._planned.set([]);
      this.toasts.success('Semaine archivée. Nouvelle semaine ouverte.');
    } catch (error) {
      this.toasts.error(error);
    }
  }
}

function summarize(title: string, created: number, merged: number): string {
  if (created === 0 && merged === 0) return `${title} ajoutée (aucun ingrédient à acheter).`;
  const parts: string[] = [];
  if (created > 0) parts.push(`${plural(created, 'ligne')} ${created > 1 ? 'ajoutées' : 'ajoutée'}`);
  if (merged > 0) parts.push(`${merged} ${merged > 1 ? 'fusionnées' : 'fusionnée'}`);
  return `${title} · ${parts.join(', ')}.`;
}
