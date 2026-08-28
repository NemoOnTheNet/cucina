import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';

/**
 * Feuille modale qui monte du bas.
 *
 * Sur mobile, c'est la seule forme de dialogue acceptable : le contenu reste
 * près du pouce et le geste de fermeture est naturel.
 */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <section class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <header>
        <span class="grabber" aria-hidden="true"></span>
        <div class="spread">
          <h2>{{ title() }}</h2>
          <button type="button" class="btn btn-quiet" (click)="closed.emit()" aria-label="Fermer">✕</button>
        </div>
      </header>
      <div class="body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: block;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: oklch(20% 0.02 50 / 0.45);
      animation: fade 140ms ease-out;
    }

    .sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 88dvh;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      box-shadow: var(--shadow-3);
      animation: slide 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    header {
      padding: var(--space-2) var(--space-4) 0;
    }

    .grabber {
      display: block;
      width: 40px;
      height: 4px;
      margin: var(--space-2) auto var(--space-3);
      border-radius: var(--radius-full);
      background: var(--border-strong);
    }

    .body {
      padding: var(--space-4);
      padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-5));
      overflow-y: auto;
    }

    @media (min-width: 700px) {
      .sheet {
        left: 50%;
        transform: translateX(-50%);
        width: min(520px, 100%);
        border-radius: var(--radius-lg);
        bottom: var(--space-5);
      }
    }

    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `,
})
export class Sheet {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    // Le premier champ de la feuille prend le focus : sur mobile, cela ouvre
    // le clavier immédiatement au lieu d'imposer un second geste.
    afterNextRender(() => {
      const element = this.host.nativeElement as HTMLElement;
      const focusable = element.querySelector<HTMLElement>('input, textarea, select, button.btn-primary');
      focusable?.focus();
    });
  }
}
