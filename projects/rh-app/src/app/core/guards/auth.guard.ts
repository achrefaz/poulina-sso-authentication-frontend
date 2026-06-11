import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TokenStore } from 'shared-auth';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

/**
 * 1. Token en mémoire et valide → accès direct
 * 2. Token absent/expiré → tente un refresh silencieux via le cookie HttpOnly
 * 3. Refresh échoue → redirection vers le SSO
 */
export const authGuard: CanActivateFn = async () => {
  const store   = inject(TokenStore);
  const service = inject(AuthService);

  if (store.isAuthenticated()) return true;

  try {
    await firstValueFrom(service.refresh());
    return true;
  } catch {
    await service.redirectToSso();
    return false;
  }
};
