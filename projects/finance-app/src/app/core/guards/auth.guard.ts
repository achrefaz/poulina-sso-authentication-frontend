import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from 'shared-auth';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

const SSO_URL = 'http://localhost:4200';
const CLIENT_ID = 'finance-client';
const ALLOWED_ROLES: string[] = ['FINANCE_USER', 'FINANCE_ADMIN'];


const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';


export const authGuard: CanActivateFn = async () => {
  const store = inject(TokenStore);
  const service = inject(AuthService);

  if (store.isAuthenticated()) {
    if (hasAllowedRole(store)) return true;
    redirectAccessDenied(store);
    return false;
  }

  try {
    await firstValueFrom(service.refresh());

    if (hasAllowedRole(store)) return true;

    redirectAccessDenied(store);
    return false;
  } catch (err: any) {
    const message: string = err?.error?.message ?? '';

    if (message.includes('rôle insuffisant') || message.includes('Accès refusé')) {
      redirectAccessDenied(store);
      return false;
    }

    await service.redirectToSso();
    return false;
  }
};

function getRoles(store: TokenStore): string[] {
  const payload = store.decode();
  if (!payload) return [];
  const claim = payload[ROLE_CLAIM] ?? payload['role'] ?? payload['roles'];
  if (Array.isArray(claim)) return claim as string[];
  if (typeof claim === 'string') return [claim];
  return [];
}

function hasAllowedRole(store: TokenStore): boolean {
  if (ALLOWED_ROLES.length === 0) return true;
  const tokenRoles = getRoles(store);
  return tokenRoles.some((r) => ALLOWED_ROLES.includes(r));
}

function redirectAccessDenied(store: TokenStore): void {
  const roles = getRoles(store);
  const userRole = roles[0] ?? '';

  const params = new URLSearchParams({
    clientId: CLIENT_ID,
    ...(userRole ? { userRole } : {}),
  });
  window.location.href = `${SSO_URL}/access-denied?${params.toString()}`;
}
