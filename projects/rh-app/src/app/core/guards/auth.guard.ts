import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStore } from 'shared-auth';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const SSO_URL = environment.ssoUrl;
// const SSO_URL = 'http://localhost:4200';
const CLIENT_ID = 'rh-client';
const ALLOWED_ROLES = ['RH_USER', 'RH_ADMIN', 'ADMIN'];
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export const authGuard: CanActivateFn = async (route) => {
  const store = inject(TokenStore);
  const service = inject(AuthService);
  const router = inject(Router);


  const ssoRoles = route.queryParams['sso_roles'] as string | undefined;

  function cleanUrlTree() {
    const { sso_roles, ...rest } = route.queryParams;
    return router.createUrlTree([route.routeConfig?.path ? `/${route.routeConfig.path}` : '/'], {
      queryParams: rest,
    });
  }

  if (store.isAuthenticated()) {
    const roles = getRolesFromToken(store);
    if (hasAllowedRole(roles)) {
      return ssoRoles ? cleanUrlTree() : true;
    }
    redirectAccessDenied();
    return false;
  }

  try {
    await firstValueFrom(service.refresh());
    const roles = getRolesFromToken(store);
    if (hasAllowedRole(roles)) {
      return ssoRoles ? cleanUrlTree() : true;
    }
    redirectAccessDenied();
    return false;
  } catch {
    service.redirectToSso();
    return false;
  }
};

function getRolesFromToken(store: TokenStore): string[] {
  const payload = store.decode();
  if (!payload) return [];
  const claim = payload[ROLE_CLAIM] ?? payload['role'] ?? payload['roles'];
  if (Array.isArray(claim)) return claim as string[];
  if (typeof claim === 'string') return [claim];
  return [];
}

function hasAllowedRole(roles: string[]): boolean {
  return roles.some((r) => ALLOWED_ROLES.includes(r));
}

function redirectAccessDenied(): void {
  const params = new URLSearchParams({ clientId: CLIENT_ID });
  window.location.href = `${SSO_URL}/access-denied?${params.toString()}`;
}
