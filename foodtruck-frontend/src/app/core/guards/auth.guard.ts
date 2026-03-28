import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authenticated = auth.isAuthenticated();
  console.log('[authGuard] isAuthenticated:', authenticated, '| user:', auth.user());
  if (authenticated) return true;
  console.warn('[authGuard] → redirect /welcome');
  return router.createUrlTree(['/welcome']);
};
