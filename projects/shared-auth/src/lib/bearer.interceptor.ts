import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SHARED_AUTH_CONFIG } from './auth-config';
import { TokenStore } from './token.store';

/**
 * Pour toute requête vers l'API backend :
 *  - withCredentials: true  → cookie HttpOnly X-Refresh-Token envoyé/accepté
 *  - Authorization: Bearer  → si un access token est présent en mémoire
 */
export const bearerInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(SHARED_AUTH_CONFIG);
  const store  = inject(TokenStore);

  if (!req.url.startsWith(config.apiUrl)) return next(req);

  let request = req.clone({ withCredentials: true });

  const token = store.getToken();
  if (token) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(request);
};
