import type { Routes } from '@angular/router';

export const householdRoutes: Routes = [
  { path: '', loadComponent: () => import('./household-page').then((m) => m.HouseholdPage) },
];
