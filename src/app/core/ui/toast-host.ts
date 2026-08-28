import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastStore } from './toast.store';

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="toast.tone">
          <span class="message">{{ toast.message }}</span>
          @if (toast.action; as action) {
            <button type="button" class="action" (click)="run(toast.id, action.run)">{{ action.label }}</button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .host {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom) + var(--space-4));
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: min(440px, calc(100vw - 2 * var(--space-4)));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius);
      background: var(--text);
      color: var(--bg);
      box-shadow: var(--shadow-3);
      font-size: 0.9rem;
      pointer-events: auto;
      animation: rise 160ms ease-out;
    }

    .toast.success { background: var(--ok); color: var(--brand-contrast); }
    .toast.error { background: var(--danger); color: var(--brand-contrast); }

    .message { flex: 1; }

    .action {
      background: none;
      border: none;
      padding: var(--space-1) var(--space-2);
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastStore);

  protected run(id: string, action: () => void): void {
    action();
    this.toasts.dismiss(id);
  }
}
