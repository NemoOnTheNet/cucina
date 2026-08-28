import type { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  { path: '', loadComponent: () => import('./recipe-list').then((m) => m.RecipeList) },
  { path: 'nouvelle', loadComponent: () => import('./recipe-editor').then((m) => m.RecipeEditor) },
  { path: ':id', loadComponent: () => import('./recipe-detail').then((m) => m.RecipeDetailPage) },
  { path: ':id/modifier', loadComponent: () => import('./recipe-editor').then((m) => m.RecipeEditor) },
];
