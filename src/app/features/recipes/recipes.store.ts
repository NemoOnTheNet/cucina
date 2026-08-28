import { Injectable, computed, inject, signal } from '@angular/core';
import { BACKEND } from '../../core/backend.provider';
import { SessionStore } from '../../core/auth/session.store';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/ui/toast.store';
import type { Recipe, RecipeDetail } from '../../domain/models';
import type { RecipeInput } from '../../data/backend';
import { compressImage } from '../../shared/image';

@Injectable({ providedIn: 'root' })
export class RecipesStore {
  private readonly backend = inject(BACKEND);
  private readonly session = inject(SessionStore);
  private readonly catalog = inject(CatalogStore);
  private readonly toasts = inject(ToastStore);

  private readonly _recipes = signal<Recipe[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _query = signal('');
  private readonly _tag = signal<string | null>(null);

  readonly recipes = this._recipes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly query = this._query.asReadonly();
  readonly tag = this._tag.asReadonly();

  readonly tags = computed(() => {
    const all = new Set<string>();
    for (const recipe of this._recipes()) for (const tag of recipe.tags) all.add(tag);
    return [...all].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly visible = computed(() => {
    const needle = normalize(this._query());
    const tag = this._tag();
    return this._recipes().filter((recipe) => {
      const matchesQuery = needle === '' || normalize(recipe.title).includes(needle);
      const matchesTag = tag === null || recipe.tags.includes(tag);
      return matchesQuery && matchesTag;
    });
  });

  setQuery(value: string): void {
    this._query.set(value);
  }

  toggleTag(tag: string): void {
    this._tag.update((current) => (current === tag ? null : tag));
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      await this.catalog.load();
      this._recipes.set(await this.backend.recipes.list(this.session.householdId()));
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Recettes indisponibles.');
    } finally {
      this._loading.set(false);
    }
  }

  async detail(recipeId: string): Promise<RecipeDetail | null> {
    return this.backend.recipes.detail(recipeId);
  }

  async create(input: RecipeInput): Promise<RecipeDetail> {
    const user = this.session.user();
    const detail = await this.backend.recipes.create(
      this.session.householdId(),
      user?.id ?? '',
      input,
    );
    this._recipes.update((all) => sortByTitle([...all, detail]));
    return detail;
  }

  async update(recipeId: string, input: RecipeInput): Promise<RecipeDetail> {
    const detail = await this.backend.recipes.update(recipeId, input);
    this._recipes.update((all) => sortByTitle(all.map((r) => (r.id === recipeId ? detail : r))));
    return detail;
  }

  async remove(recipeId: string): Promise<void> {
    try {
      await this.backend.recipes.remove(recipeId);
      this._recipes.update((all) => all.filter((recipe) => recipe.id !== recipeId));
      this.toasts.success('Recette supprimée.');
    } catch (error) {
      this.toasts.error(error);
    }
  }

  /** Envoie une photo compressée et retourne son chemin de stockage. */
  async uploadPhoto(recipeId: string, file: Blob): Promise<string> {
    const compressed = await compressImage(file);
    return this.backend.photos.upload(this.session.householdId(), recipeId, compressed);
  }

  async photoUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    return this.backend.photos.url(path);
  }
}

function sortByTitle<T extends { title: string }>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
}

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
