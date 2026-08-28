import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/ui/toast.store';
import type { RecipeDetail, RecipeIngredient } from '../../domain/models';
import { formatQuantity } from '../../domain/quantities';
import { Sheet } from '../../shared/sheet';
import { WeekStore } from '../week/week.store';
import { RecipePhoto } from './recipe-photo';
import { RecipesStore } from './recipes.store';

@Component({
  selector: 'app-recipe-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Sheet, RecipePhoto],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.css',
})
export class RecipeDetailPage implements OnDestroy {
  /** Lié depuis l'URL par `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly store = inject(RecipesStore);
  private readonly catalog = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastStore);
  protected readonly week = inject(WeekStore);

  protected readonly recipe = signal<RecipeDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly planning = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly servings = signal(4);
  protected readonly cooking = signal(false);

  private wakeLock: WakeLockSentinel | null = null;

  protected readonly totalMinutes = computed(() => {
    const recipe = this.recipe();
    if (!recipe) return 0;
    return (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  });

  constructor() {
    void this.load();
  }

  ngOnDestroy(): void {
    void this.releaseWakeLock();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      await Promise.all([this.catalog.load(), this.week.ensureLoaded()]);
      const detail = await this.store.detail(this.id());
      if (!detail) {
        this.missing.set(true);
        return;
      }
      this.recipe.set(detail);
      this.servings.set(detail.servings);
    } catch (error) {
      this.toasts.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected productName(ingredient: RecipeIngredient): string {
    return this.catalog.name(ingredient.productId);
  }

  protected quantityOf(ingredient: RecipeIngredient): string {
    return formatQuantity({ value: ingredient.quantity, unit: ingredient.unit });
  }

  protected step(delta: number): void {
    this.servings.update((value) => Math.max(1, Math.min(30, value + delta)));
  }

  protected async addToWeek(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;
    this.planning.set(false);
    await this.week.add(recipe.id, this.servings());
    await this.router.navigate(['/semaine']);
  }

  protected async remove(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;
    this.confirmingDelete.set(false);
    await this.store.remove(recipe.id);
    await this.router.navigate(['/recettes']);
  }

  /** Mode cuisine : étapes en grand, écran maintenu allumé (histoire L2.6). */
  protected async toggleCooking(): Promise<void> {
    const next = !this.cooking();
    this.cooking.set(next);
    if (next) {
      await this.requestWakeLock();
    } else {
      await this.releaseWakeLock();
    }
  }

  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // Refus du navigateur ou batterie faible : le mode cuisine reste utile sans.
      this.wakeLock = null;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    try {
      await this.wakeLock?.release();
    } catch {
      // Rien à faire : le verrou est déjà tombé.
    }
    this.wakeLock = null;
  }
}
