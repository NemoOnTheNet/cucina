import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';

/** L'écran « quel foyer ? » suppose un compte, mais pas encore de foyer. */
const requireNoHousehold: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const status = session.status();
  if (status === 'no-household') return true;
  return router.createUrlTree([status === 'ready' ? '/courses' : '/bienvenue']);
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
