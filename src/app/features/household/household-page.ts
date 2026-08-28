import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { HouseholdStore } from './household.store';
import { ToastStore } from '../../core/ui/toast.store';
import type { HouseholdInvite, HouseholdMember } from '../../domain/models';
import { Sheet } from '../../shared/sheet';
import { inputValue } from '../../shared/forms';

@Component({
  selector: 'app-household-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  templateUrl: './household-page.html',
  styleUrl: './household-page.css',
})
export class HouseholdPage {
  protected readonly session = inject(SessionStore);
  protected readonly store = inject(HouseholdStore);
  private readonly toasts = inject(ToastStore);
  private readonly router = inject(Router);

  protected readonly renaming = signal(false);
  protected readonly draftName = signal('');
  protected readonly removing = signal<HouseholdMember | null>(null);

  constructor() {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      await this.store.refresh();
    } catch (error) {
      this.toasts.error(error);
    }
  }

  protected openRename(): void {
    this.draftName.set(this.session.household()?.name ?? '');
    this.renaming.set(true);
  }

  protected async rename(): Promise<void> {
    this.renaming.set(false);
    try {
      await this.session.renameHousehold(this.draftName());
      this.toasts.success('Foyer renommé.');
    } catch (error) {
      this.toasts.error(error);
    }
  }

  protected async createInvite(): Promise<void> {
    try {
      await this.store.createInvite();
    } catch (error) {
      this.toasts.error(error);
    }
  }

  protected async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.toasts.success('Code copié.');
    } catch {
      // Le presse-papier peut être refusé : le code reste lisible à l'écran.
      this.toasts.show(`Code : ${code}`);
    }
  }

  protected async revoke(invite: HouseholdInvite): Promise<void> {
    try {
      await this.store.revokeInvite(invite);
    } catch (error) {
      this.toasts.error(error);
    }
  }

  protected async confirmRemoveMember(): Promise<void> {
    const member = this.removing();
    if (!member) return;
    this.removing.set(null);
    try {
      await this.store.removeMember(member);
      this.toasts.success(`${member.displayName} a été retiré du foyer.`);
    } catch (error) {
      this.toasts.error(error);
    }
  }

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/bienvenue']);
  }

  protected expiryLabel(invite: HouseholdInvite): string {
    const days = Math.max(
      0,
      Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    return days <= 1 ? "Expire aujourd'hui" : `Expire dans ${days} jours`;
  }

  protected readonly inputValue = inputValue;
}
