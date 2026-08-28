import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="panel">
      <div class="logo">
        <span class="mark" aria-hidden="true">🍅</span>
        <h1>Cucina</h1>
        <p>Les recettes de la semaine remplissent la liste de courses toutes seules.</p>
      </div>

      <div class="stack">
        <a class="btn btn-primary btn-block" routerLink="/bienvenue/inscription">Créer un compte</a>
        <a class="btn btn-ghost btn-block" routerLink="/bienvenue/connexion">J'ai déjà un compte</a>
      </div>
    </div>
  `,
  styleUrl: './auth-layout.css',
})
export class Welcome {}
