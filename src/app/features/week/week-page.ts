import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Recipe, WeekPlanRecipe } from '../../domain/models';
import { Sheet } from '../../shared/sheet';
import { RecipePhoto } from '../recipes/recipe-photo';
import { plural } from '../../shared/plural';
import { WeekStore, type PlannedEntry } from './week.store';

@Component({
  selector: 'app-week-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Sheet, RecipePhoto],
  templateUrl: './week-page.html',
  styleUrl: './week-page.css',
})
export class WeekPage {
  protected readonly store = inject(WeekStore);
  protected readonly plural = plural;

  protected readonly picking = signal(false);
  protected readonly chosen = signal<Recipe | null>(null);
  protected readonly servings = signal(4);
  protected readonly adjusting = signal<PlannedEntry | null>(null);

  constructor() {
    void this.store.load();
  }

  protected openPicker(): void {
    this.picking.set(true);
  }

  protected choose(recipe: Recipe): void {
    this.chosen.set(recipe);
    this.servings.set(recipe.servings);
    this.picking.set(false);
  }

  protected async confirmAdd(): Promise<void> {
    const recipe = this.chosen();
    if (!recipe) return;
    this.chosen.set(null);
    await this.store.add(recipe.id, this.servings());
  }

  protected openAdjust(entry: PlannedEntry): void {
    this.adjusting.set(entry);
    this.servings.set(entry.planned.servings);
  }

  protected async confirmAdjust(): Promise<void> {
    const entry = this.adjusting();
    if (!entry) return;
    this.adjusting.set(null);
    await this.store.setServings(entry.planned, this.servings());
  }

  protected async removeEntry(planned: WeekPlanRecipe): Promise<void> {
    this.adjusting.set(null);
    await this.store.remove(planned);
  }

  protected step(delta: number): void {
    this.servings.update((value) => Math.max(1, Math.min(30, value + delta)));
  }

  protected async archive(): Promise<void> {
    await this.store.archive();
  }
}
