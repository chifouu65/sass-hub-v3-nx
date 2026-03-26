import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'apps',
    loadComponent: () =>
      import('./components/apps/apps.component').then(m => m.AppsComponent),
  },
  {
    path: 'billing',
    loadComponent: () =>
      import('./components/billing/billing.component').then(m => m.BillingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./components/account/account.component').then(m => m.AccountComponent),
  },
  { path: '**', redirectTo: '' },
];
