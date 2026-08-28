import { InjectionToken, type Provider } from '@angular/core';
import type { Backend } from '../data/backend';
import { LocalBackend } from '../data/local/local-backend';
import { SupabaseBackend } from '../data/supabase/supabase-backend';
import { APP_CONFIG, defaultConfig, isSupabaseConfigured, type AppConfig } from './config';

/** Seul point de contact entre l'application et une implémentation de backend. */
export const BACKEND = new InjectionToken<Backend>('BACKEND');

export function provideBackend(config: AppConfig = defaultConfig): Provider[] {
  return [
    { provide: APP_CONFIG, useValue: config },
    {
      provide: BACKEND,
      useFactory: (appConfig: AppConfig): Backend => {
        const url = appConfig.supabaseUrl;
        const key = appConfig.supabaseAnonKey;
        return isSupabaseConfigured(appConfig) && url !== null && key !== null
          ? new SupabaseBackend(url, key)
          : new LocalBackend();
      },
      deps: [APP_CONFIG],
    },
  ];
}
