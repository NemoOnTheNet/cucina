import { InjectionToken } from '@angular/core';

/**
 * Configuration de l'application.
 *
 * Tant que `supabaseUrl` / `supabaseAnonKey` valent `null`, Cucina tourne sur son
 * backend local (IndexedDB) : utilisable immédiatement, mais sans partage entre
 * appareils. Renseigner les deux valeurs bascule sur Supabase (cf. ADR-0006).
 *
 * La clé « anon » de Supabase est publique par nature : c'est RLS qui protège les
 * données, jamais le secret de cette clé. Aucune clé `service_role` ici, jamais.
 */
export interface AppConfig {
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const defaultConfig: AppConfig = {
  supabaseUrl: 'https://dweocuewmljwqolaiguf.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3ZW9jdWV3bWxqd3FvbGFpZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTc2NDEsImV4cCI6MjEwMzQ5MzY0MX0.D_LTJBcITM7-5h80rQBk2Vcd_9GWp24jf6tgo3b5lQU',
};

export function isSupabaseConfigured(config: AppConfig): boolean {
  return (config.supabaseUrl?.length ?? 0) > 0 && (config.supabaseAnonKey?.length ?? 0) > 0;
}
