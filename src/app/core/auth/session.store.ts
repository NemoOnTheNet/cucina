import { Injectable, computed, inject, signal } from '@angular/core';
import { BACKEND } from '../backend.provider';
import type { AuthUser } from '../../data/backend';
import type { Household, HouseholdMember } from '../../domain/models';

/**
 * Qui est connecté, et à quel foyer.
 *
 * C'est le seul état vraiment global de l'application : tout le reste est
 * rattaché à un foyer, donc dépend de ce store.
 */
export type SessionStatus = 'loading' | 'anonymous' | 'no-household' | 'ready';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly backend = inject(BACKEND);

  private readonly _status = signal<SessionStatus>('loading');
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _household = signal<Household | null>(null);
  private readonly _members = signal<HouseholdMember[]>([]);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly household = this._household.asReadonly();
  readonly members = this._members.asReadonly();

  readonly isOwner = computed(() => {
    const user = this._user();
    const household = this._household();
    return user !== null && household !== null && household.ownerId === user.id;
  });

  /** Identifiant du foyer courant. Lève si appelé hors d'un écran protégé. */
  householdId(): string {
    const household = this._household();
    if (!household) throw new Error('Aucun foyer courant.');
    return household.id;
  }

  /** Restaure la session au démarrage. Ne lève jamais : au pire, on est anonyme. */
  async restore(): Promise<void> {
    this._status.set('loading');
    try {
      const user = await this.backend.auth.currentUser();
      if (!user) {
        this.reset('anonymous');
        return;
      }
      this._user.set(user);
      await this.loadHousehold(user);
    } catch {
      this.reset('anonymous');
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const user = await this.backend.auth.signUp(email, password, displayName);
    this._user.set(user);
    await this.loadHousehold(user);
  }

  async signIn(email: string, password: string): Promise<void> {
    const user = await this.backend.auth.signIn(email, password);
    this._user.set(user);
    await this.loadHousehold(user);
  }

  async signOut(): Promise<void> {
    await this.backend.auth.signOut();
    this.reset('anonymous');
  }

  async createHousehold(name: string): Promise<void> {
    const user = this._user();
    if (!user) throw new Error('Connexion requise.');
    const household = await this.backend.households.create(name, user);
    this._household.set(household);
    await this.refreshMembers();
    this._status.set('ready');
  }

  async joinHousehold(code: string): Promise<void> {
    const user = this._user();
    if (!user) throw new Error('Connexion requise.');
    const household = await this.backend.households.acceptInvite(code, user);
    this._household.set(household);
    await this.refreshMembers();
    this._status.set('ready');
  }

  async renameHousehold(name: string): Promise<void> {
    const household = this._household();
    if (!household) return;
    this._household.set(await this.backend.households.rename(household.id, name));
  }

  async refreshMembers(): Promise<void> {
    const household = this._household();
    if (!household) return;
    this._members.set(await this.backend.households.members(household.id));
  }

  private async loadHousehold(user: AuthUser): Promise<void> {
    const household = await this.backend.households.current(user.id);
    this._household.set(household);
    if (!household) {
      this._members.set([]);
      this._status.set('no-household');
      return;
    }
    await this.refreshMembers();
    this._status.set('ready');
  }

  private reset(status: SessionStatus): void {
    this._user.set(null);
    this._household.set(null);
    this._members.set([]);
    this._status.set(status);
  }
}
