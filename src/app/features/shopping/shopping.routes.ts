import type { Routes } from '@angular/router';

export const shoppingRoutes: Routes = [
  { path: '', loadComponent: () => import('./shopping-page').then((m) => m.ShoppingPage) },
];
