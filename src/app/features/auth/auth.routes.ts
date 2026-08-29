import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { rememberInvite } from '../../core/auth/pending-invite';

/**
 * L'écran « quel foyer ? » suppose un compte, mais pas encore de foyer.
 *
 * Le code du lien d'invitation est mis de côté **ici**, avant toute redirection :
 * quelqu'un qui n'a pas encore de compte est renvoyé vers l'inscription sans que
 * le composant soit monté, et le code serait perdu — précisément dans le cas où
 * le lien sert à quelque chose.
 */
const requireNoHousehold: CanActivateFn = (route) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const invited = route.queryParamMap.get('code');
  if (invited) rememberInvite(invited);

  const status = session.status();
  if (status === 'no-household') return true;
  if (status === 'ready') return router.createUrlTree(['/courses']);
  // Sans compte mais avec une invitation en poche : l'inscription est l'étape
  // suivante évidente, inutile de repasser par l'écran d'accueil.
  return router.createUrlTree([invited ? '/bienvenue/inscription' : '/bienvenue']);
};

export const authRoutes: Routes = [
  { path: '', loadComponent: () => import('./welcome').then((m) => m.Welcome) },
  { path: 'connexion', loadComponent: () => import('./sign-in').then((m) => m.SignIn) },
  { path: 'inscription', loadComponent: () => import('./sign-up').then((m) => m.SignUp) },
  {
    path: 'foyer',
    canActivate: [requireNoHousehold],
    loadComponent: () => import('./household-setup').then((m) => m.HouseholdSetup),
  },
];
