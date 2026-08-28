import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideBackend } from './core/backend.provider';
import { defaultConfig } from './core/config';
import { SessionStore } from './core/auth/session.store';
import { PlatformService } from './core/platform';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideBackend(defaultConfig),
    // L'app s'ouvre hors ligne en lecture. Les écritures, elles, restent en
    // ligne en v1 : voir la limitation assumée dans docs/04-architecture.md.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // La session est restaurée avant le premier rendu : sans cela, les gardes
    // redirigeraient vers l'accueil public à chaque rechargement.
    provideAppInitializer(() => inject(SessionStore).restore()),
    provideAppInitializer(() => inject(PlatformService).applyNativeChrome()),
  ],
};
