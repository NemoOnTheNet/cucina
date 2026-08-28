import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/ui/toast.store';
import type { RecipeInput } from '../../data/backend';
import { SELECTABLE_UNITS, unitLabel, type UnitId } from '../../domain/quantities';
import { fileValue, inputValue, numberValue } from '../../shared/forms';
import { RecipePhoto } from './recipe-photo';
import { RecipesStore } from './recipes.store';

interface IngredientDraft {
  name: string;
  quantity: number | null;
  unit: UnitId | null;
  note: string;
}

function emptyIngredient(): IngredientDraft {
  return { name: '', quantity: null, unit: null, note: '' };
}

@Component({
  selector: 'app-recipe-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RecipePhoto],
  templateUrl: './recipe-editor.html',
  styleUrl: './recipe-editor.css',
})
export class RecipeEditor {
  readonly id = input<string | undefined>(undefined);

  private readonly store = inject(RecipesStore);
  private readonly catalog = inject(CatalogStore);
  private readonly toasts = inject(ToastStore);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly servings = signal(4);
  protected readonly prepMinutes = signal<number | null>(null);
  protected readonly cookMinutes = signal<number | null>(null);
  protected readonly source = signal('');
  protected readonly tagsText = signal('');
  protected readonly ingredients = signal<IngredientDraft[]>([emptyIngredient()]);
  protected readonly steps = signal<string[]>(['']);
  protected readonly utensils = signal<string[]>([]);

  protected readonly photoPath = signal<string | null>(null);
  protected readonly pendingPhoto = signal<File | null>(null);
  protected readonly pendingPhotoUrl = signal<string | null>(null);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly units = SELECTABLE_UNITS;
  protected readonly unitLabel = unitLabel;
  protected readonly inputValue = inputValue;
  protected readonly numberValue = numberValue;

  protected readonly catalogProducts = this.catalog.products;
  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly canSave = computed(() => this.title().trim().length > 0 && !this.saving());

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.catalog.load();
    const id = this.id();
    if (!id) return;

    this.loading.set(true);
    try {
      const recipe = await this.store.detail(id);
      if (!recipe) {
        this.error.set('Recette introuvable.');
        return;
      }
      this.title.set(recipe.title);
      this.description.set(recipe.description ?? '');
      this.servings.set(recipe.servings);
      this.prepMinutes.set(recipe.prepMinutes);
      this.cookMinutes.set(recipe.cookMinutes);
      this.source.set(recipe.source ?? '');
      this.tagsText.set(recipe.tags.join(', '));
      this.photoPath.set(recipe.photoPath);
      this.ingredients.set(
        recipe.ingredients.length === 0
          ? [emptyIngredient()]
          : recipe.ingredients.map((ingredient) => ({
              name: this.catalog.name(ingredient.productId),
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              note: ingredient.note ?? '',
            })),
      );
      this.steps.set(recipe.steps.length === 0 ? [''] : recipe.steps.map((step) => step.text));
      this.utensils.set(recipe.utensils.map((utensil) => utensil.name));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Chargement impossible.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Ingrédients ────────────────────────────────────────────

  protected patchIngredient(index: number, patch: Partial<IngredientDraft>): void {
    this.ingredients.update((all) => all.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  protected addIngredient(): void {
    this.ingredients.update((all) => [...all, emptyIngredient()]);
  }

  protected removeIngredient(index: number): void {
    this.ingredients.update((all) => (all.length === 1 ? [emptyIngredient()] : all.filter((_, i) => i !== index)));
  }

  protected onUnitChange(index: number, event: Event): void {
    const raw = inputValue(event);
    this.patchIngredient(index, { unit: raw === '' ? null : (raw as UnitId) });
  }

  // ── Étapes ─────────────────────────────────────────────────

  protected patchStep(index: number, text: string): void {
    this.steps.update((all) => all.map((step, i) => (i === index ? text : step)));
  }

  protected addStep(): void {
    this.steps.update((all) => [...all, '']);
  }

  protected removeStep(index: number): void {
    this.steps.update((all) => (all.length === 1 ? [''] : all.filter((_, i) => i !== index)));
  }

  protected moveStep(index: number, delta: number): void {
    this.steps.update((all) => {
      const target = index + delta;
      if (target < 0 || target >= all.length) return all;
      const copy = [...all];
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
  }

  // ── Ustensiles ─────────────────────────────────────────────

  protected patchUtensil(index: number, value: string): void {
    this.utensils.update((all) => all.map((item, i) => (i === index ? value : item)));
  }

  protected addUtensil(): void {
    this.utensils.update((all) => [...all, '']);
  }

  protected removeUtensil(index: number): void {
    this.utensils.update((all) => all.filter((_, i) => i !== index));
  }

  // ── Photo ──────────────────────────────────────────────────

  protected onPhotoSelected(event: Event): void {
    const file = fileValue(event);
    if (!file) return;
    this.pendingPhoto.set(file);
    const previous = this.pendingPhotoUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.pendingPhotoUrl.set(URL.createObjectURL(file));
  }

  protected clearPhoto(): void {
    const previous = this.pendingPhotoUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.pendingPhotoUrl.set(null);
    this.pendingPhoto.set(null);
    this.photoPath.set(null);
  }

  protected stepServings(delta: number): void {
    this.servings.update((value) => Math.max(1, Math.min(30, value + delta)));
  }

  // ── Enregistrement ─────────────────────────────────────────

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set(null);

    try {
      const ingredients = await this.resolveIngredients();
      const input: RecipeInput = {
        title: this.title(),
        description: blankToNull(this.description()),
        servings: this.servings(),
        prepMinutes: this.prepMinutes(),
        cookMinutes: this.cookMinutes(),
        source: blankToNull(this.source()),
        tags: this.tagsText()
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        photoPath: this.photoPath(),
        ingredients,
        steps: this.steps().map((step) => step.trim()).filter((step) => step.length > 0),
        utensils: this.utensils().map((utensil) => utensil.trim()).filter((utensil) => utensil.length > 0),
      };

      const existingId = this.id();
      let saved = existingId ? await this.store.update(existingId, input) : await this.store.create(input);

      // La photo ne peut être envoyée qu'une fois l'identifiant connu.
      const file = this.pendingPhoto();
      if (file) {
        const path = await this.store.uploadPhoto(saved.id, file);
        saved = await this.store.update(saved.id, { ...input, photoPath: path });
      }

      this.toasts.success(existingId ? 'Recette mise à jour.' : 'Recette créée.');
      await this.router.navigate(['/recettes', saved.id]);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      this.saving.set(false);
    }
  }

  /** Chaque ingrédient nommé devient un produit du catalogue, créé au besoin. */
  private async resolveIngredients(): Promise<RecipeInput['ingredients']> {
    const rows = this.ingredients().filter((row) => row.name.trim().length > 0);
    const resolved: RecipeInput['ingredients'] = [];
    for (const row of rows) {
      const product = await this.catalog.findOrCreate(row.name, row.unit);
      resolved.push({
        productId: product.id,
        quantity: row.quantity,
        unit: row.unit,
        note: blankToNull(row.note),
      });
    }
    return resolved;
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
