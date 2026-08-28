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
  supabaseUrl: null,
  supabaseAnonKey: null,
};

export function isSupabaseConfigured(config: AppConfig): boolean {
  return (config.supabaseUrl?.length ?? 0) > 0 && (config.supabaseAnonKey?.length ?? 0) > 0;
}
