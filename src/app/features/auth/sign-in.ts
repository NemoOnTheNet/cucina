import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { inputValue } from '../../shared/forms';

@Component({
  selector: 'app-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="panel">
      <a class="back" routerLink="/bienvenue">← Retour</a>

      <div class="logo">
        <h1>Content de te revoir</h1>
      </div>

      <form (submit)="submit($event)">
        @if (error(); as message) {
          <p class="error-banner">{{ message }}</p>
        }

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" class="input" type="email" autocomplete="email" required
                 [value]="email()" (input)="email.set(inputValue($event))" />
        </div>

        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" class="input" type="password" autocomplete="current-password" required
                 [value]="password()" (input)="password.set(inputValue($event))" />
        </div>

        <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
          {{ busy() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="alt">Pas encore de compte ? <a routerLink="/bienvenue/inscription">Créer un compte</a></p>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class SignIn {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly inputValue = inputValue;

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.session.signIn(this.email(), this.password());
      await this.router.navigate([this.session.status() === 'ready' ? '/courses' : '/bienvenue/foyer']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      this.busy.set(false);
    }
  }
}
