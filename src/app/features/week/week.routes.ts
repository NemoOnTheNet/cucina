import type { Routes } from '@angular/router';

export const weekRoutes: Routes = [
  { path: '', loadComponent: () => import('./week-page').then((m) => m.WeekPage) },
];
