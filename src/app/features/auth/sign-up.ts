import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { inputValue } from '../../shared/forms';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-sign-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="panel">
      <a class="back" routerLink="/bienvenue">← Retour</a>

      <div class="logo">
        <h1>Créer un compte</h1>
        <p>Un compte, un foyer, et la liste de courses de tout le monde.</p>
      </div>

      <form (submit)="submit($event)">
        @if (error(); as message) {
          <p class="error-banner">{{ message }}</p>
        }

        <div class="field">
          <label for="name">Ton prénom</label>
          <input id="name" class="input" type="text" autocomplete="given-name" required
                 [value]="displayName()" (input)="displayName.set(inputValue($event))" />
        </div>

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" class="input" type="email" autocomplete="email" required
                 [value]="email()" (input)="email.set(inputValue($event))" />
        </div>

        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" class="input" type="password" autocomplete="new-password" required
                 [value]="password()" (input)="password.set(inputValue($event))" />
          <span class="small faint">{{ MIN_PASSWORD_LENGTH }} caractères minimum.</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="busy() || !valid()">
          {{ busy() ? 'Création…' : 'Créer mon compte' }}
        </button>
      </form>

      <p class="alt">Déjà inscrit ? <a routerLink="/bienvenue/connexion">Se connecter</a></p>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class SignUp {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly inputValue = inputValue;

  protected readonly valid = computed(
    () =>
      this.displayName().trim().length > 0 &&
      this.email().includes('@') &&
      this.password().length >= MIN_PASSWORD_LENGTH,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy() || !this.valid()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.session.signUp(this.email(), this.password(), this.displayName());
      await this.router.navigate(['/bienvenue/foyer']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Création impossible.');
    } finally {
      this.busy.set(false);
    }
  }
}
