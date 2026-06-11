import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from 'shared-auth';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

const SSO_URL = 'http://localhost:4200';
const CLIENT_ID = 'rh-client';

export const authGuard: CanActivateFn = async () => {
  const store = inject(TokenStore);
  const service = inject(AuthService);

  if (store.isAuthenticated()) return true;

  try {
    await firstValueFrom(service.refresh());
    return true;
  } catch (err: any) {
    const message: string = err?.error?.message ?? '';

    if (message.includes('rôle insuffisant') || message.includes('Accès refusé')) {
      const payload = store.decode();
      const userRole = (payload?.['role'] as string) ?? (payload?.['roles'] as string[])?.[0] ?? '';

      const params = new URLSearchParams({
        clientId: CLIENT_ID,
        ...(userRole ? { userRole } : {}),
      });

      window.location.href = `${SSO_URL}/access-denied?${params.toString()}`;
      return false;
    }

    await service.redirectToSso();
    return false;
  }
};
