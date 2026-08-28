import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RecipesStore } from './recipes.store';

/**
 * Affiche la photo d'une recette.
 *
 * Le chemin stocké n'est pas une URL : le backend local rend une URL d'objet, le
 * backend Supabase une URL signée. La résolution est donc asynchrone.
 */
@Component({
  selector: 'app-recipe-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url(); as source) {
      <img [src]="source" [alt]="alt()" loading="lazy" />
    } @else {
      <span class="placeholder" aria-hidden="true">🍽️</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      overflow: hidden;
      background: var(--surface-2);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .placeholder {
      font-size: 1.8rem;
      opacity: 0.5;
    }
  `,
})
export class RecipePhoto {
  readonly path = input<string | null>(null);
  readonly alt = input('');

  private readonly store = inject(RecipesStore);
  protected readonly url = signal<string | null>(null);

  constructor() {
    effect(() => {
      const path = this.path();
      this.url.set(null);
      if (!path) return;
      void this.store.photoUrl(path).then((resolved) => this.url.set(resolved));
    });
  }
}
