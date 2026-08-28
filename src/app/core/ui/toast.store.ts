import { Injectable, signal } from '@angular/core';
import { newId } from '../ids';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly action?: { readonly label: string; readonly run: () => void };
}

const LIFETIME_MS = 4500;

/** Retours brefs et non bloquants. Une action « Annuler » peut y être attachée. */
@Injectable({ providedIn: 'root' })
export class ToastStore {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, tone: ToastTone = 'info', action?: Toast['action']): void {
    const toast: Toast = { id: newId(), message, tone, action };
    this._toasts.update((all) => [...all, toast]);
    setTimeout(() => this.dismiss(toast.id), LIFETIME_MS);
  }

  success(message: string, action?: Toast['action']): void {
    this.show(message, 'success', action);
  }

  error(error: unknown): void {
    this.show(error instanceof Error ? error.message : 'Une erreur est survenue.', 'error');
  }

  dismiss(id: string): void {
    this._toasts.update((all) => all.filter((toast) => toast.id !== id));
  }
}
