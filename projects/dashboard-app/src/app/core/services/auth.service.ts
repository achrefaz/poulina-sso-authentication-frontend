import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TokenStore } from 'shared-auth';
import type { RefreshResponse, UserInfo } from 'shared-auth';
import { environment } from '../../../environments/environment';

const SSO_URL = environment.ssoUrl;
const SSO_API_URL = environment.apiUrl;

// const SSO_URL = 'http://localhost:4200';
// const SSO_API_URL = 'http://localhost:5095';
const CLIENT_ID = 'dashboard-client';

export interface RefreshError {
  status: number;
  errorCode?: string;
  roles?: string[];
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TokenStore);

  async ensureAuthenticated(): Promise<boolean> {
    if (this.store.isAuthenticated()) {
      return true;
    }
    try {
      await firstValueFrom(this.refresh());
      return true;
    } catch (error) {
      return false;
    }
  }

  refresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(
        `${SSO_API_URL}/api/Auth/refresh`,
        { clientId: CLIENT_ID },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          this.store.setToken(res.accessToken, res.expiresIn);
        }),
        catchError((err: HttpErrorResponse) => {
          const refreshError: RefreshError = {
            status: err.status,
            errorCode: err.error?.errorCode,
            roles: err.error?.roles,
            message: err.error?.message,
          };
          return throwError(() => refreshError);
        }),
      );
  }

  getUserInfo(): Observable<UserInfo> {
    return this.http
      .get<UserInfo>(`${SSO_API_URL}/api/Auth/userinfo`, { withCredentials: true }) // ← était '/api/Auth/userinfo'
      .pipe(
        catchError((err) => {
          return throwError(() => err);
        }),
      );
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${SSO_API_URL}/api/Auth/logout`, {}, { withCredentials: true }) // ← était '/api/Auth/logout'
      .pipe(
        tap(() => {
          this.store.clear();
          sessionStorage.removeItem('sso_roles');
          sessionStorage.removeItem('sso_tokens');
          window.location.href = `${SSO_URL}/login`;
        }),
        catchError((err) => {
          return throwError(() => err);
        }),
      );
  }

  redirectToSso(): void {
    this.store.clear();
    sessionStorage.removeItem('sso_roles');
    sessionStorage.removeItem('sso_tokens');
    window.location.href = `${SSO_URL}/login`;
  }
}
