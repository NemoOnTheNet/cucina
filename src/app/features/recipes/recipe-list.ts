import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { inputValue } from '../../shared/forms';
import { RecipePhoto } from './recipe-photo';
import { RecipesStore } from './recipes.store';

@Component({
  selector: 'app-recipe-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RecipePhoto],
  template: `
    <div class="page">
      <div class="spread">
        <h1>Recettes</h1>
        <a class="btn btn-primary small-btn" routerLink="/recettes/nouvelle">+ Nouvelle</a>
      </div>

      @if (store.error(); as message) {
        <p class="error-banner">{{ message }}</p>
      }

      @if (store.recipes().length > 0) {
        <input
          class="input"
          type="search"
          placeholder="Chercher une recette…"
          aria-label="Chercher une recette"
          [value]="store.query()"
          (input)="store.setQuery(inputValue($event))"
        />

        @if (store.tags().length > 0) {
          <div class="tags">
            @for (tag of store.tags(); track tag) {
              <button type="button" class="chip" [class.on]="store.tag() === tag" (click)="store.toggleTag(tag)">
                {{ tag }}
              </button>
            }
          </div>
        }
      }

      @if (store.loading()) {
        <div class="grid" aria-hidden="true">
          @for (row of [1, 2, 3, 4]; track row) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (store.recipes().length === 0) {
        <div class="empty-state">
          <span class="emoji" aria-hidden="true">📖</span>
          <h2>Aucune recette</h2>
          <p>Ajoute les plats que vous faites vraiment. Leurs ingrédients iront tout seuls dans la liste de courses.</p>
          <a class="btn btn-primary" routerLink="/recettes/nouvelle">Créer ma première recette</a>
        </div>
      } @else if (store.visible().length === 0) {
        <div class="empty-state">
          <span class="emoji" aria-hidden="true">🔍</span>
          <p>Aucune recette ne correspond.</p>
        </div>
      } @else {
        <ul class="grid">
          @for (recipe of store.visible(); track recipe.id) {
            <li>
              <a class="card recipe" [routerLink]="['/recettes', recipe.id]">
                <app-recipe-photo class="photo" [path]="recipe.photoPath" [alt]="recipe.title" />
                <div class="info">
                  <h2>{{ recipe.title }}</h2>
                  <p class="small faint">
                    {{ recipe.servings }} portions
                    @if (recipe.prepMinutes || recipe.cookMinutes) {
                      · {{ (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) }} min
                    }
                  </p>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .page {
      padding: var(--space-4) var(--space-4) var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .small-btn {
      min-height: 38px;
      padding: 0 var(--space-3);
      font-size: 0.85rem;
      text-decoration: none;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .tags .chip {
      border: 1px solid var(--border);
      cursor: pointer;
    }

    .tags .chip.on {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--brand-contrast);
    }

    .grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--space-3);
    }

    .recipe {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }

    .photo {
      aspect-ratio: 4 / 3;
      width: 100%;
    }

    .info {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info h2 {
      font-size: 0.98rem;
    }

    .skeleton-card {
      aspect-ratio: 3 / 4;
      border-radius: var(--radius-lg);
      background: var(--surface-2);
      animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
      50% { opacity: 0.55; }
    }
  `,
})
export class RecipeList {
  protected readonly store = inject(RecipesStore);
  protected readonly inputValue = inputValue;

  constructor() {
    void this.store.load();
  }
}
