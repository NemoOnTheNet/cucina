import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, type ElementRef } from '@angular/core';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/ui/toast.store';
import { categoryEmoji } from '../../domain/categories';
import type { ShoppingItem } from '../../domain/models';
import { formatQuantity, SELECTABLE_UNITS, unitLabel, type UnitId } from '../../domain/quantities';
import { Sheet } from '../../shared/sheet';
import { SwipeToDelete } from '../../shared/swipe-to-delete';
import { inputValue, numberValue } from '../../shared/forms';
import { plural } from '../../shared/plural';
import { ShoppingStore } from './shopping.store';

@Component({
  selector: 'app-shopping-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet, SwipeToDelete],
  templateUrl: './shopping-page.html',
  styleUrl: './shopping-page.css',
})
export class ShoppingPage {
  protected readonly store = inject(ShoppingStore);
  protected readonly catalog = inject(CatalogStore);
  private readonly toasts = inject(ToastStore);

  protected readonly draft = signal('');
  protected readonly editing = signal<ShoppingItem | null>(null);
  protected readonly confirmingClose = signal(false);

  protected readonly editQuantity = signal<number | null>(null);
  protected readonly editUnit = signal<UnitId | null>(null);
  protected readonly editNote = signal('');

  protected readonly units = SELECTABLE_UNITS;
  protected readonly inputValue = inputValue;
  protected readonly numberValue = numberValue;
  protected readonly categoryEmoji = categoryEmoji;
  protected readonly plural = plural;
  protected readonly unitLabel = unitLabel;

  protected readonly suggestions = computed(() => this.catalog.suggest(this.draft()));

  private readonly quickAdd = viewChild<ElementRef<HTMLInputElement>>('quickAdd');

  constructor() {
    void this.store.load();
  }

  protected quantityOf(item: ShoppingItem): string {
    return formatQuantity({ value: item.quantity, unit: item.unit });
  }

  protected nameOf(item: ShoppingItem): string {
    return this.catalog.name(item.productId);
  }

  /** Provenance d'une ligne, telle qu'affichée sous le nom (histoire L1.8). */
  protected originOf(item: ShoppingItem): string {
    const recipes = item.sources.length;
    if (recipes === 0) {
      // Une ligne sans origine et non ajoutée à la main est une survivante :
      // sa recette a quitté la semaine mais elle était déjà cochée (règle R3).
      return item.addedManually ? 'Ajout manuel' : 'Recette retirée de la semaine';
    }
    const label = recipes === 1 ? '1 recette' : `${recipes} recettes`;
    return item.addedManually ? `${label} + ajout manuel` : label;
  }

  protected async submitDraft(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.draft().trim();
    if (name.length === 0) return;
    this.clearDraft();
    await this.store.addManual(name);
  }

  protected async addSuggestion(name: string): Promise<void> {
    this.clearDraft();
    await this.store.addManual(name);
  }

  /**
   * Vide le champ et lui rend le focus, pour enchaîner les articles.
   *
   * On remet la valeur du DOM à la main : une liaison `[value]` ne réécrit le
   * champ que si l'expression liée a changé du point de vue d'Angular, ce qui
   * n'est pas garanti quand la saisie et la validation tombent dans le même cycle.
   */
  private clearDraft(): void {
    this.draft.set('');
    const field = this.quickAdd()?.nativeElement;
    if (field) {
      field.value = '';
      field.focus();
    }
  }

  protected openEditor(item: ShoppingItem): void {
    this.editing.set(item);
    this.editQuantity.set(item.quantity);
    this.editUnit.set(item.unit);
    this.editNote.set(item.note ?? '');
  }

  protected async saveEditor(): Promise<void> {
    const item = this.editing();
    if (!item) return;
    await this.store.setTotal(item, this.editQuantity(), this.editUnit());
    const refreshed = this.store.items().find((existing) => existing.id === item.id);
    if (refreshed) await this.store.setNote(refreshed, this.editNote());
    this.editing.set(null);
  }

  protected async deleteFromEditor(): Promise<void> {
    const item = this.editing();
    if (!item) return;
    this.editing.set(null);
    await this.store.remove(item);
  }

  protected onUnitChange(event: Event): void {
    const raw = inputValue(event);
    this.editUnit.set(raw === '' ? null : (raw as UnitId));
  }

  protected async confirmClose(): Promise<void> {
    this.confirmingClose.set(false);
    await this.store.close();
  }

  protected notifyEmpty(): void {
    this.toasts.show('La liste est déjà vide.');
  }
}
