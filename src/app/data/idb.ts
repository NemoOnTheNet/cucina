/**
 * Micro-couche IndexedDB, sans dépendance.
 *
 * Les magasins reproduisent une à une les tables décrites dans
 * docs/05-modele-donnees.md : l'implémentation Supabase est alors un simple
 * miroir, et les deux backends restent lisibles côte à côte.
 */

export const STORES = [
  'users',
  'session',
  'households',
  'members',
  'invites',
  'products',
  'recipes',
  'ingredients',
  'steps',
  'utensils',
  'week_plans',
  'week_plan_recipes',
  'shopping_lists',
  'shopping_items',
  'shopping_item_sources',
  'photos',
] as const;

export type StoreName = (typeof STORES)[number];

const DB_NAME = 'cucina';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible'));
  });
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Opération IndexedDB en échec'));
  });
}

export interface Keyed {
  id: string;
}

export async function getAll<T extends Keyed>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  return promisify(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function getOne<T extends Keyed>(store: StoreName, id: string): Promise<T | null> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  const found = await promisify(tx.objectStore(store).get(id) as IDBRequest<T | undefined>);
  return found ?? null;
}

export async function put<T extends Keyed>(store: StoreName, value: T): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).put(value));
  await done(tx);
  return value;
}

export async function putMany<T extends Keyed>(store: StoreName, values: readonly T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const value of values) objectStore.put(value);
  await done(tx);
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).delete(id));
  await done(tx);
}

export async function removeMany(store: StoreName, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const id of ids) objectStore.delete(id);
  await done(tx);
}

/** Supprime toutes les entrées d'un magasin satisfaisant un prédicat. */
export async function removeWhere<T extends Keyed>(store: StoreName, predicate: (value: T) => boolean): Promise<string[]> {
  const all = await getAll<T>(store);
  const ids = all.filter(predicate).map((value) => value.id);
  await removeMany(store, ids);
  return ids;
}

export async function findWhere<T extends Keyed>(store: StoreName, predicate: (value: T) => boolean): Promise<T[]> {
  const all = await getAll<T>(store);
  return all.filter(predicate);
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Transaction IndexedDB en échec'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée'));
  });
}

/** Vide toute la base locale (utilisé à la déconnexion d'un compte local). */
export async function clearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([...STORES], 'readwrite');
  for (const store of STORES) tx.objectStore(store).clear();
  await done(tx);
}
