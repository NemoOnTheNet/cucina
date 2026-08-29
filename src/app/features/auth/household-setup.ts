import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { inputValue } from '../../shared/forms';
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../../core/ids';

type Mode = 'create' | 'join';

/**
 * Dernière étape avant d'entrer : créer son foyer, ou rejoindre celui d'un proche.
 * Le nom est pré-rempli pour que personne ne bloque sur un champ vide.
 */
@Component({
  selector: 'app-household-setup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <div class="logo">
        <span class="mark" aria-hidden="true">🏡</span>
        <h1>Ton foyer</h1>
        <p>Tout — recettes, semaine, liste de courses — est partagé à l'échelle du foyer.</p>
      </div>

      <div class="switcher" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'create'"
                [class.on]="mode() === 'create'" (click)="mode.set('create')">
          Créer un foyer
        </button>
        <button type="button" role="tab" [attr.aria-selected]="mode() === 'join'"
                [class.on]="mode() === 'join'" (click)="mode.set('join')">
          Rejoindre
        </button>
      </div>

      @if (error(); as message) {
        <p class="error-banner">{{ message }}</p>
      }

      @if (mode() === 'create') {
        <form (submit)="create($event)">
          <div class="field">
            <label for="household">Nom du foyer</label>
            <input id="household" class="input" type="text" required
                   [value]="name()" (input)="name.set(inputValue($event))" />
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
            {{ busy() ? 'Création…' : 'Créer mon foyer' }}
          </button>
        </form>
      } @else {
        <form (submit)="join($event)">
          <div class="field">
            <label for="code">Code d'invitation</label>
            <input id="code" class="input code" type="text" inputmode="text" autocapitalize="characters"
                   autocomplete="one-time-code" spellcheck="false"
                   [attr.maxlength]="codeLength" [placeholder]="codePlaceholder"
                   [value]="code()" (input)="code.set(normalizeCode(inputValue($event)))" />
            <span class="small faint">Le gérant du foyer te l'a transmis. Il expire au bout de 7 jours.</span>
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy() || code().length < codeLength">
            {{ busy() ? 'Vérification…' : 'Rejoindre le foyer' }}
          </button>
        </form>
      }

      <button type="button" class="btn btn-quiet" (click)="signOut()">Se déconnecter</button>
    </div>
  `,
  styles: [
    `
      .switcher {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-1);
        padding: var(--space-1);
        background: var(--surface-2);
        border-radius: var(--radius);
      }

      .switcher button {
        min-height: var(--touch);
        border: none;
        border-radius: calc(var(--radius) - 4px);
        background: transparent;
        color: var(--text-muted);
        font-weight: 600;
      }

      .switcher button.on {
        background: var(--surface);
        color: var(--text);
        box-shadow: var(--shadow-1);
      }

      .code {
        text-align: center;
        letter-spacing: 0.35em;
        font-size: 1.4rem;
        font-weight: 700;
        text-transform: uppercase;
      }
    `,
  ],
  styleUrl: './auth-layout.css',
})
export class HouseholdSetup {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly mode = signal<Mode>('create');
  protected readonly code = signal('');
  protected readonly codeLength = INVITE_CODE_LENGTH;
  /** Exemple de la bonne longueur, pour que le champ montre ce qu'il attend. */
  protected readonly codePlaceholder = 'BKMR47TQ'.slice(0, INVITE_CODE_LENGTH);
  protected readonly normalizeCode = normalizeInviteCode;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly inputValue = inputValue;

  private readonly suggestion = computed(() => {
    const first = this.session.user()?.displayName.trim();
    return first ? `Chez ${first}` : 'Mon foyer';
  });

  protected readonly name = signal(this.suggestion());

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    await this.run(() => this.session.createHousehold(this.name()));
  }

  protected async join(event: Event): Promise<void> {
    event.preventDefault();
    await this.run(() => this.session.joinHousehold(this.code()));
  }

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/bienvenue']);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
      await this.router.navigate(['/courses']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Opération impossible.');
    } finally {
      this.busy.set(false);
    }
  }
}
