import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SessionStore } from './session.store';

/** Protège les écrans qui supposent un utilisateur connecté ET un foyer. */
export const requireHousehold: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  switch (session.status()) {
    case 'ready':
      return true;
    case 'no-household':
      return router.createUrlTree(['/bienvenue/foyer']);
    default:
      return router.createUrlTree(['/bienvenue']);
  }
};

/** Empêche de revenir sur l'accueil public quand tout est déjà en place. */
export const requireAnonymous: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session.status() === 'ready' ? router.createUrlTree(['/courses']) : true;
};
