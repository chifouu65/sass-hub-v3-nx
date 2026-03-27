import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const managerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const manager = auth.isManager();
  console.log('[managerGuard] isManager:', manager, '| role:', auth.role(), '| user:', auth.user());
  if (manager) return true;
  console.warn('[managerGuard] → redirect /discover (role =', auth.role(), ')');
  return router.createUrlTree(['/discover']);
};
