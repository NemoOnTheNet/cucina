import { Injectable, computed, inject, signal } from '@angular/core';
import { BACKEND } from '../backend.provider';
import { SessionStore } from '../auth/session.store';
import type { Product } from '../../domain/models';
import type { CategoryId } from '../../domain/categories';
import type { UnitId } from '../../domain/quantities';

/**
 * Le catalogue de produits du foyer.
 *
 * Partagé par les courses et les recettes : c'est justement parce que les deux
 * pointent le MÊME produit que « les carottes du curry » peuvent fusionner avec
 * « les carottes que je voulais de toute façon ».
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly backend = inject(BACKEND);
  private readonly session = inject(SessionStore);

  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();

  readonly byId = computed(() => new Map(this._products().map((product) => [product.id, product])));

  async load(): Promise<void> {
    this._products.set(await this.backend.products.list(this.session.householdId()));
  }

  name(productId: string): string {
    return this.byId().get(productId)?.name ?? 'Produit supprimé';
  }

  category(productId: string): CategoryId {
    return this.byId().get(productId)?.category ?? 'autre';
  }

  async findOrCreate(name: string, defaultUnit: UnitId | null = null): Promise<Product> {
    const product = await this.backend.products.findOrCreate(this.session.householdId(), name, defaultUnit);
    this.upsert(product);
    return product;
  }

  async setCategory(productId: string, category: CategoryId): Promise<void> {
    this.upsert(await this.backend.products.update(productId, { category }));
  }

  async rename(productId: string, name: string): Promise<void> {
    this.upsert(await this.backend.products.update(productId, { name }));
  }

  /** Propositions d'autocomplétion, les plus courtes d'abord (donc les plus probables). */
  suggest(query: string, limit = 6): Product[] {
    const needle = normalize(query);
    if (needle.length === 0) return [];
    return this._products()
      .filter((product) => normalize(product.name).includes(needle))
      .sort((a, b) => {
        const aStarts = normalize(a.name).startsWith(needle) ? 0 : 1;
        const bStarts = normalize(b.name).startsWith(needle) ? 0 : 1;
        return aStarts - bStarts || a.name.length - b.name.length;
      })
      .slice(0, limit);
  }

  private upsert(product: Product): void {
    this._products.update((all) => {
      const index = all.findIndex((existing) => existing.id === product.id);
      if (index === -1) return [...all, product].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const copy = [...all];
      copy[index] = product;
      return copy;
    });
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
