import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BACKEND } from '../../core/backend.provider';
import { SessionStore } from '../../core/auth/session.store';
import { newId } from '../../core/ids';
import type {
  Backend,
  HouseholdGateway,
  PhotoGateway,
  ProductGateway,
  ProductInput,
  RecipeGateway,
  ShoppingGateway,
  WeekGateway,
} from '../../data/backend';
import { guessCategory } from '../../domain/categories';
import type { Product, ShoppingItem, ShoppingList } from '../../domain/models';
import type { UnitId } from '../../domain/quantities';
import type { ItemMutation } from '../../domain/shopping-list';
import { ShoppingStore } from './shopping.store';

const HOUSEHOLD = 'h-1';

/** Backend en mémoire : les gateways inutiles à ce store lèvent, plutôt que de mentir. */
class FakeProducts implements ProductGateway {
  readonly rows: Product[] = [];

  async list(): Promise<Product[]> {
    return [...this.rows];
  }

  async create(householdId: string, input: ProductInput): Promise<Product> {
    const product: Product = {
      id: newId(),
      householdId,
      name: input.name,
      category: input.category,
      defaultUnit: input.defaultUnit,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.rows.push(product);
    return product;
  }

  async update(productId: string, changes: Partial<ProductInput>): Promise<Product> {
    const index = this.rows.findIndex((row) => row.id === productId);
    const updated = { ...this.rows[index], ...changes };
    this.rows[index] = updated;
    return updated;
  }

  async findOrCreate(householdId: string, name: string, defaultUnit: UnitId | null = null): Promise<Product> {
    const existing = this.rows.find((row) => row.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    return this.create(householdId, { name: name.trim(), category: guessCategory(name), defaultUnit });
  }
}

class FakeShopping implements ShoppingGateway {
  readonly list: ShoppingList = {
    id: 'list-1',
    householdId: HOUSEHOLD,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    closedAt: null,
  };
  rows: ShoppingItem[] = [];

  async activeList(): Promise<ShoppingList> {
    return this.list;
  }

  async items(): Promise<ShoppingItem[]> {
    return this.rows.map((row) => ({ ...row, sources: [...row.sources] }));
  }

  async apply(mutations: readonly ItemMutation[]): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.kind === 'delete') {
        this.rows = this.rows.filter((row) => row.id !== mutation.itemId);
        continue;
      }
      if (mutation.kind === 'patch') {
        // Comme les vrais backends : seules les colonnes du patch sont écrites,
        // les origines de la ligne restent celles que la « base » connaît.
        const index = this.rows.findIndex((row) => row.id === mutation.itemId);
        if (index !== -1) this.rows[index] = { ...this.rows[index], ...mutation.changes };
        continue;
      }
      const index = this.rows.findIndex((row) => row.id === mutation.item.id);
      if (index === -1) this.rows.push(mutation.item);
      else this.rows[index] = mutation.item;
    }
  }

  watch(): () => void {
    return () => undefined;
  }

  async close(): Promise<ShoppingList> {
    this.rows = [];
    return this.list;
  }

  async archivedLists(): Promise<ShoppingList[]> {
    return [];
  }
}

function unsupported(): never {
  throw new Error('Gateway non utilisée par ce test.');
}

class FakeBackend implements Backend {
  readonly kind = 'local' as const;
  readonly products = new FakeProducts();
  readonly shopping = new FakeShopping();
  readonly auth = { currentUser: unsupported, signUp: unsupported, signIn: unsupported, signOut: unsupported };
  readonly households = unsupported as unknown as HouseholdGateway;
  readonly recipes = unsupported as unknown as RecipeGateway;
  readonly week = unsupported as unknown as WeekGateway;
  readonly photos = unsupported as unknown as PhotoGateway;
}

class FakeSession {
  householdId(): string {
    return HOUSEHOLD;
  }
}

describe('ShoppingStore', () => {
  let store: ShoppingStore;
  let backend: FakeBackend;

  beforeEach(async () => {
    backend = new FakeBackend();
    TestBed.configureTestingModule({
      providers: [
        { provide: BACKEND, useValue: backend },
        { provide: SessionStore, useClass: FakeSession },
      ],
    });
    store = TestBed.inject(ShoppingStore);
    await store.load();
  });

  it('ajoute un article avec le seul nom, sans quantité', async () => {
    await store.addManual('Papier toilette');

    expect(store.items()).toHaveLength(1);
    expect(store.items()[0].quantity).toBeNull();
    expect(store.items()[0].addedManually).toBe(true);
    expect(backend.shopping.rows).toHaveLength(1);
  });

  it('devine le rayon et groupe la liste dans l\'ordre du magasin', async () => {
    await store.addManual('Lessive');
    await store.addManual('Carottes');

    const groups = store.groups().map((group) => group.category.id);
    expect(groups).toEqual(['fruits-legumes', 'entretien']);
  });

  it('fusionne un besoin de recette avec la ligne manuelle existante', async () => {
    await store.addManual('Carottes');
    const product = backend.products.rows[0];

    const result = await store.applyNeeds([
      { productId: product.id, quantity: 600, unit: 'g', weekPlanRecipeId: 'wpr-1' },
    ]);

    expect(result.merged).toBe(1);
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0].quantity).toBe(600);
  });

  it('retire les apports d\'une recette sans toucher au reste', async () => {
    await store.addManual('Lait');
    const lait = backend.products.rows[0];
    await store.applyNeeds([
      { productId: lait.id, quantity: 500, unit: 'ml', weekPlanRecipeId: 'wpr-1' },
    ]);
    const beurre = await backend.products.findOrCreate(HOUSEHOLD, 'Beurre');
    await store.applyNeeds([
      { productId: beurre.id, quantity: 250, unit: 'g', weekPlanRecipeId: 'wpr-1' },
    ]);

    await store.removePlannedRecipe('wpr-1');

    const names = store.items().map((item) => item.productId);
    expect(names).toEqual([lait.id]);
    expect(store.items()[0].quantity).toBeNull();
  });

  it('compte ce qui reste à prendre', async () => {
    await store.addManual('Lait');
    await store.addManual('Beurre');
    await store.toggle(store.items()[0]);

    expect(store.total()).toBe(2);
    expect(store.remaining()).toBe(1);
    expect(store.allChecked()).toBe(false);
  });

  it('cocher depuis un écran périmé n\'efface pas la recette ajoutée entre-temps', async () => {
    // L'écran affiche « Carottes, ajout manuel ».
    await store.addManual('Carottes');
    const carottes = backend.products.rows[0];
    const stale = store.items()[0];

    // Ailleurs — autre membre, autre appareil — une recette apporte 600 g.
    const fresh = { ...backend.shopping.rows[0], sources: [...backend.shopping.rows[0].sources] };
    fresh.sources.push({
      id: 's-distante',
      shoppingItemId: fresh.id,
      weekPlanRecipeId: 'wpr-1',
      quantity: 600,
    });
    fresh.quantity = 600;
    backend.shopping.rows[0] = fresh;

    // On coche sur l'écran resté ouvert, avec sa copie périmée.
    await store.toggle(stale);

    const stored = backend.shopping.rows[0];
    expect(stored.checked).toBe(true);
    expect(stored.sources).toHaveLength(1);
    expect(stored.quantity).toBe(600);
    expect(stored.productId).toBe(carottes.id);
  });

  it('archive la liste et repart d\'une liste vide', async () => {
    await store.addManual('Lait');
    await store.close();

    expect(store.items()).toHaveLength(0);
    expect(backend.shopping.rows).toHaveLength(0);
  });
});
