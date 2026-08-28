import { Injectable, inject, signal } from '@angular/core';
import { BACKEND } from '../../core/backend.provider';
import { APP_CONFIG, isSupabaseConfigured } from '../../core/config';
import { SessionStore } from '../../core/auth/session.store';
import type { HouseholdInvite, HouseholdMember } from '../../domain/models';

/**
 * Le foyer : ses membres, ses invitations.
 *
 * L'écran passe par ici et jamais par le backend — c'est la règle, et c'est
 * aussi ce qui lui évite de savoir laquelle des deux implémentations tourne.
 */
@Injectable({ providedIn: 'root' })
export class HouseholdStore {
  private readonly backend = inject(BACKEND);
  private readonly config = inject(APP_CONFIG);
  private readonly session = inject(SessionStore);

  private readonly _invites = signal<HouseholdInvite[]>([]);
  private readonly _busy = signal(false);

  readonly invites = this._invites.asReadonly();
  readonly busy = this._busy.asReadonly();

  /**
   * Le foyer est-il réellement partageable ?
   *
   * C'est une question de configuration — l'application est-elle hébergée —
   * et non d'implémentation : personne ici n'a besoin de savoir si les données
   * dorment dans IndexedDB ou dans Postgres.
   */
  readonly sharingHosted = isSupabaseConfigured(this.config);

  async refresh(): Promise<void> {
    await this.session.refreshMembers();
    const household = this.session.household();
    if (!household || !this.session.isOwner()) {
      this._invites.set([]);
      return;
    }
    this._invites.set(await this.backend.households.activeInvites(household.id));
  }

  async createInvite(): Promise<void> {
    const household = this.session.household();
    const user = this.session.user();
    if (!household || !user || this._busy()) return;
    this._busy.set(true);
    try {
      const invite = await this.backend.households.createInvite(household.id, user.id);
      this._invites.update((all) => [...all, invite]);
    } finally {
      this._busy.set(false);
    }
  }

  async revokeInvite(invite: HouseholdInvite): Promise<void> {
    await this.backend.households.revokeInvite(invite.id);
    this._invites.update((all) => all.filter((existing) => existing.id !== invite.id));
  }

  async removeMember(member: HouseholdMember): Promise<void> {
    const household = this.session.household();
    if (!household) return;
    await this.backend.households.removeMember(household.id, member.userId);
    await this.session.refreshMembers();
  }
}
