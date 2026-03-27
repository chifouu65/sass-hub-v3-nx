import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { managerGuard } from './core/guards/manager.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/discover', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        m => m.RegisterComponent
      ),
  },
  {
    path: 'discover',
    loadComponent: () =>
      import('./features/customer/discover/discover.component').then(
        m => m.DiscoverComponent
      ),
  },
  {
    path: 'truck/:id',
    loadComponent: () =>
      import('./features/truck-profile/truck-profile.component').then(
        m => m.TruckProfileComponent
      ),
  },
  {
    path: 'manager',
    canActivate: [authGuard, managerGuard],
    children: [
      // Onboarding: standalone, no sidebar shell
      {
        path: 'onboarding',
        loadComponent: () =>
          import('./features/manager/onboarding/onboarding.component').then(
            m => m.ManagerOnboardingComponent
          ),
      },
      // Admin shell — wraps dashboard + all panel pages
      {
        path: '',
        loadComponent: () =>
          import('./features/manager/shell/manager-shell.component').then(
            m => m.ManagerShellComponent
          ),
        children: [
          // Default redirect inside the shell
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/manager/dashboard/dashboard.component').then(
                m => m.ManagerDashboardComponent
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/manager/truck-settings/truck-settings.component').then(
                m => m.TruckSettingsComponent
              ),
          },
          {
            path: 'menu',
            loadComponent: () =>
              import('./features/manager/menu/menu.component').then(
                m => m.ManagerMenuComponent
              ),
          },
          {
            path: 'orders',
            loadComponent: () =>
              import('./features/manager/orders/orders.component').then(
                m => m.ManagerOrdersComponent
              ),
          },
          {
            path: 'location',
            loadComponent: () =>
              import('./features/manager/location/location.component').then(
                m => m.ManagerLocationComponent
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'my',
    canActivate: [authGuard],
    children: [
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/customer/favorites/favorites.component').then(
            m => m.FavoritesComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/customer/order-history/order-history.component').then(
            m => m.OrderHistoryComponent
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/customer/order-detail/order-detail.component').then(
            m => m.OrderDetailComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '/discover' },
];
