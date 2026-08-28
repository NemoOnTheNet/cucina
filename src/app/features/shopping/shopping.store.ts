import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { BACKEND } from '../../core/backend.provider';
import { SessionStore } from '../../core/auth/session.store';
import { CatalogStore } from '../../core/catalog/catalog.store';
import { ToastStore } from '../../core/ui/toast.store';
import { newId } from '../../core/ids';
import { CATEGORIES, categoryOrder, type Category, type CategoryId } from '../../domain/categories';
import type { ShoppingItem, ShoppingList } from '../../domain/models';
import type { UnitId } from '../../domain/quantities';
import {
  addNeeds,
  annotateItem,
  checkItem,
  removeRecipeContribution,
  retotalItem,
  type ItemMutation,
  type Need,
} from '../../domain/shopping-list';

export interface ShoppingGroup {
  readonly category: Category;
  readonly items: readonly ShoppingItem[];
}

/**
 * L'état de la liste de courses.
 *
 * Le store n'implémente AUCUNE règle métier : il appelle `domain/shopping-list`,
 * persiste les mutations retournées, et met à jour ses signaux.
 */
@Injectable({ providedIn: 'root' })
export class ShoppingStore {
  private readonly backend = inject(BACKEND);
  private readonly session = inject(SessionStore);
  private readonly catalog = inject(CatalogStore);
  private readonly toasts = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  /** Coupe l'écoute de la liste précédente quand on en ouvre une autre. */
  private unwatch: (() => void) | null = null;
  /** Rechargement provoqué par nos propres écritures : à ignorer. */
  private selfWriteUntil = 0;

  private readonly _list = signal<ShoppingList | null>(null);
  private readonly _items = signal<ShoppingItem[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly list = this._list.asReadonly();
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly remaining = computed(() => this._items().filter((item) => !item.checked).length);
  readonly total = computed(() => this._items().length);
  readonly allChecked = computed(() => this.total() > 0 && this.remaining() === 0);

  /**
   * La liste, groupée par rayon dans l'ordre du parcours en magasin. Les lignes
   * cochées descendent en bas de leur rayon sans en sortir : on retrouve un
   * article reposé au même endroit.
   */
  readonly groups = computed<ShoppingGroup[]>(() => {
    const byCategory = new Map<CategoryId, ShoppingItem[]>();
    for (const item of this._items()) {
      const category = this.catalog.category(item.productId);
      const bucket = byCategory.get(category) ?? [];
      bucket.push(item);
      byCategory.set(category, bucket);
    }

    return CATEGORIES.filter((category) => byCategory.has(category.id))
      .map((category) => ({
        category,
        items: (byCategory.get(category.id) ?? []).sort((a, b) => {
          if (a.checked !== b.checked) return a.checked ? 1 : -1;
          return this.catalog.name(a.productId).localeCompare(this.catalog.name(b.productId), 'fr');
        }),
      }))
      .sort((a, b) => categoryOrder(a.category.id) - categoryOrder(b.category.id));
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.unwatch?.());
  }

  /** Charge la liste si ce n'est pas déjà fait : la semaine peut avoir besoin
   * d'y écrire alors que l'écran des courses n'a jamais été ouvert. */
  async ensureLoaded(): Promise<void> {
    if (this._list() === null) await this.load();
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      await this.catalog.load();
      const list = await this.backend.shopping.activeList(this.session.householdId());
      this._list.set(list);
      this._items.set(await this.backend.shopping.items(list.id));
      this.watch(list.id);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Liste indisponible.');
    } finally {
      this._loading.set(false);
    }
  }

  /** Ajout manuel : un nom suffit, le reste est facultatif (principe « zéro friction »). */
  async addManual(name: string, quantity: number | null = null, unit: UnitId | null = null): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    await this.ensureLoaded();

    try {
      const product = await this.catalog.findOrCreate(trimmed, unit);
      await this.applyNeeds([{ productId: product.id, quantity, unit, weekPlanRecipeId: null }]);
    } catch (error) {
      this.toasts.error(error);
    }
  }

  /** Fait entrer des besoins dans la liste (règles R1 et R2). */
  async applyNeeds(needs: readonly Need[]): Promise<{ created: number; merged: number }> {
    await this.ensureLoaded();
    const list = this._list();
    if (!list || needs.length === 0) return { created: 0, merged: 0 };

    const change = addNeeds(this._items(), needs, list.id, newId);
    this._items.set(change.items);
    // L'échec remonte : la semaine ne doit pas se croire à jour si la liste ne l'est pas.
    await this.persistOrThrow(change.mutations);
    return { created: change.created, merged: change.merged };
  }

  /** Retire d'une liste ce qu'une recette planifiée y avait apporté (règle R3). */
  async removePlannedRecipe(weekPlanRecipeId: string): Promise<number> {
    await this.ensureLoaded();
    const change = removeRecipeContribution(this._items(), weekPlanRecipeId);
    this._items.set(change.items);
    await this.persistOrThrow(change.mutations);
    return change.removed;
  }

  /** Cocher est l'action la plus fréquente : elle est optimiste, jamais bloquée par le réseau. */
  async toggle(item: ShoppingItem): Promise<void> {
    const change = checkItem(item);
    this.replace(change.item);
    try {
      await this.write([change.mutation]);
    } catch (error) {
      this.replace(item);
      this.toasts.error(error);
    }
  }

  async setTotal(item: ShoppingItem, total: number | null, unit: UnitId | null): Promise<void> {
    const change = retotalItem(item, total, unit);
    this.replace(change.item);
    await this.persist([change.mutation]);
  }

  async setNote(item: ShoppingItem, note: string): Promise<void> {
    const change = annotateItem(item, note);
    this.replace(change.item);
    await this.persist([change.mutation]);
  }

  /** Suppression annulable : on ne perd jamais une ligne sur un geste mal maîtrisé. */
  async remove(item: ShoppingItem): Promise<void> {
    this._items.update((all) => all.filter((existing) => existing.id !== item.id));
    await this.persist([{ kind: 'delete', itemId: item.id }]);
    this.toasts.show(`${this.catalog.name(item.productId)} retiré`, 'info', {
      label: 'Annuler',
      run: () => void this.restore(item),
    });
  }

  async close(): Promise<void> {
    const list = this._list();
    if (!list) return;
    try {
      const next = await this.backend.shopping.close(this.session.householdId());
      this._list.set(next);
      this._items.set([]);
      this.watch(next.id);
      this.toasts.success('Courses terminées. Nouvelle liste ouverte.');
    } catch (error) {
      this.toasts.error(error);
    }
  }

  private async restore(item: ShoppingItem): Promise<void> {
    this._items.update((all) => [...all, item]);
    await this.persist([{ kind: 'create', item }]);
  }

  private replace(item: ShoppingItem): void {
    this._items.update((all) => all.map((existing) => (existing.id === item.id ? item : existing)));
  }

  /** Persiste et signale l'échec à l'écran, sans le propager à l'appelant. */
  private async persist(mutations: readonly ItemMutation[]): Promise<void> {
    try {
      await this.persistOrThrow(mutations);
    } catch (error) {
      this.toasts.error(error);
    }
  }

  /**
   * Persiste, et laisse l'erreur remonter. La source de vérité reste la base :
   * en cas d'échec on recharge plutôt que de laisser l'écran afficher un état
   * que personne n'a enregistré.
   */
  private async persistOrThrow(mutations: readonly ItemMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    try {
      await this.write(mutations);
    } catch (error) {
      await this.load();
      throw error;
    }
  }

  /**
   * Toute écriture passe ici. La fenêtre de garde évite qu'une notification
   * temps réel déclenchée par nos propres écritures ne relance un rechargement.
   */
  private async write(mutations: readonly ItemMutation[]): Promise<void> {
    this.selfWriteUntil = Date.now() + SELF_WRITE_WINDOW_MS;
    await this.backend.shopping.apply(mutations);
    this.selfWriteUntil = Date.now() + SELF_WRITE_WINDOW_MS;
  }

  /** (Re)branche l'écoute temps réel sur la liste active. */
  private watch(shoppingListId: string): void {
    this.unwatch?.();
    this.unwatch = this.backend.shopping.watch(shoppingListId, () => void this.onRemoteChange());
  }

  private async onRemoteChange(): Promise<void> {
    if (Date.now() < this.selfWriteUntil) return;
    const list = this._list();
    if (!list) return;
    try {
      this._items.set(await this.backend.shopping.items(list.id));
    } catch {
      // Une notification ratée n'est pas une erreur à montrer : le prochain
      // changement, ou la prochaine ouverture de l'écran, remettra tout d'aplomb.
    }
  }
}

/**
 * Nos propres écritures reviennent par le canal temps réel. On les ignore
 * pendant ce court laps de temps, sinon chaque case cochée provoquerait un
 * rechargement complet de la liste.
 */
const SELF_WRITE_WINDOW_MS = 1500;
