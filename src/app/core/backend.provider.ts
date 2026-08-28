import {
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import type { Backend } from '../data/backend';
import { APP_CONFIG, defaultConfig, isSupabaseConfigured, type AppConfig } from './config';

/** Seul point de contact entre l'application et une implémentation de backend. */
export const BACKEND = new InjectionToken<Backend>('BACKEND');

/**
 * À attendre avant toute injection de `BACKEND`.
 *
 * Angular démarre ses initialiseurs en parallèle : celui qui restaure la session
 * doit donc attendre ce jeton explicitement, sinon il réclame un backend qui
 * n'est pas encore chargé.
 */
export const BACKEND_READY = new InjectionToken<Promise<void>>('BACKEND_READY');

/**
 * Le backend choisi, chargé à la demande.
 *
 * Les deux implémentations sont des modules dynamiques : en mode local, le
 * client Supabase — plusieurs centaines de kilo-octets — n'est jamais téléchargé.
 */
class BackendHolder {
  private backend: Backend | null = null;
  private loading: Promise<void> | null = null;

  ready(config: AppConfig): Promise<void> {
    this.loading ??= this.load(config);
    return this.loading;
  }

  get(): Backend {
    if (!this.backend) {
      throw new Error("Le backend n'est pas encore prêt : attendre BACKEND_READY.");
    }
    return this.backend;
  }

  private async load(config: AppConfig): Promise<void> {
    if (isSupabaseConfigured(config) && config.supabaseUrl && config.supabaseAnonKey) {
      const { SupabaseBackend } = await import('../data/supabase/supabase-backend');
      this.backend = new SupabaseBackend(config.supabaseUrl, config.supabaseAnonKey);
      return;
    }
    const { LocalBackend } = await import('../data/local/local-backend');
    this.backend = new LocalBackend();
  }
}

export function provideBackend(config: AppConfig = defaultConfig): EnvironmentProviders {
  const holder = new BackendHolder();
  return makeEnvironmentProviders([
    { provide: APP_CONFIG, useValue: config },
    { provide: BACKEND_READY, useFactory: (): Promise<void> => holder.ready(config) },
    { provide: BACKEND, useFactory: (): Backend => holder.get() },
  ]);
}
