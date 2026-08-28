import { Routes } from '@angular/router';
import { requireAnonymous, requireHousehold } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'bienvenue',
    canActivate: [requireAnonymous],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [requireHousehold],
    loadComponent: () => import('./features/shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'courses',
        loadChildren: () => import('./features/shopping/shopping.routes').then((m) => m.shoppingRoutes),
      },
      {
        path: 'semaine',
        loadChildren: () => import('./features/week/week.routes').then((m) => m.weekRoutes),
      },
      {
        path: 'recettes',
        loadChildren: () => import('./features/recipes/recipes.routes').then((m) => m.recipesRoutes),
      },
      {
        path: 'foyer',
        loadChildren: () => import('./features/household/household.routes').then((m) => m.householdRoutes),
      },
      { path: '', pathMatch: 'full', redirectTo: 'courses' },
    ],
  },
  { path: '**', redirectTo: '' },
];
