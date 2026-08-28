import {
  ApplicationConfig,
  Injector,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { BACKEND_READY, provideBackend } from './core/backend.provider';
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
    // redirigeraient vers l'accueil public à chaque rechargement. Le backend est
    // chargé à la demande : il faut l'attendre ici, car Angular démarre tous ses
    // initialiseurs en parallèle et `SessionStore` réclame le backend d'emblée.
    provideAppInitializer(() => {
      // `inject()` n'est plus valable après un `await` : on prend l'injecteur
      // tant qu'on est dans son contexte, et on instancie le store ensuite.
      const injector = inject(Injector);
      return inject(BACKEND_READY).then(() => injector.get(SessionStore).restore());
    }),
    provideAppInitializer(() => inject(PlatformService).applyNativeChrome()),
  ],
};
