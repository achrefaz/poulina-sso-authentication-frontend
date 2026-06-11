import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from 'shared-auth';

/** Protège les routes internes du SSO qui nécessitent un access token */
export const authGuard: CanActivateFn = () => {
  const store  = inject(TokenStore);
  const router = inject(Router);

  if (store.isAuthenticated()) return true;

  router.navigate(['/login']);
  return false;
};
