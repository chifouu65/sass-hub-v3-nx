import { Route } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { managerGuard } from './core/guards/manager.guard';
import { AuthService } from './core/services/auth.service';

export const appRoutes: Route[] = [
  {
    // Root: authenticated → role-based redirect; unauthenticated → /welcome
    path: '',
    pathMatch: 'full',
    canActivate: [() => {
      const auth = inject(AuthService);
      const router = inject(Router);
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/welcome']);
      }
      if (auth.isManager()) {
        return router.createUrlTree(['/manager/dashboard']);
      }
      return router.createUrlTree(['/discover']);
    }],
    loadComponent: () =>
      import('./features/customer/discover/discover.component').then(
        m => m.DiscoverComponent
      ),
  },
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/auth/welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'discover',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/customer/discover/discover.component').then(
        m => m.DiscoverComponent
      ),
  },
  {
    path: 'truck/:id',
    canActivate: [authGuard],
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
