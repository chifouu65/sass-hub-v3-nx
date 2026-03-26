import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'apps',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/apps/apps.component').then(m => m.AppsComponent),
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/billing/billing.component').then(m => m.BillingComponent),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/account/account.component').then(m => m.AccountComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
