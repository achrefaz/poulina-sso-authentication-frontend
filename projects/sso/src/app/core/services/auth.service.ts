import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TokenStore } from 'shared-auth';
import type {
  UserInfo,
  LoginDirectResponse,
  MfaVerifyResponse,ForgotPasswordResponse,
  ResetPasswordResponse
} from 'shared-auth';
import { environment } from '../../../environments/environment';

export type { UserInfo };

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TokenStore);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  // ── Rôles réels, récupérés via le cookie HttpOnly (jamais via URL) ───────
  fetchCurrentRoles(): Observable<string[]> {
    return this.http
      .post<{
        accessToken: string;
        expiresIn: number;
      }>(`${this.api}/api/Auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => this.store.setToken(res.accessToken, res.expiresIn)),
        map(() => this.getRolesFromToken()),
        catchError((err) => throwError(() => err)),
      );
  }

  private getRolesFromToken(): string[] {
    const payload = this.store.decode();
    if (!payload) return [];
    const claim = payload[ROLE_CLAIM] ?? payload['role'] ?? payload['roles'];
    if (Array.isArray(claim)) return claim as string[];
    if (typeof claim === 'string') return [claim];
    return [];
  }

  loginDirect(email: string, password: string): Observable<LoginDirectResponse> {
    return this.http
      .post<LoginDirectResponse>(
        `${this.api}/api/Auth/login-direct`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(catchError(this.handleError));
  }

  verifyMfa(mfaPendingToken: string, code: string): Observable<MfaVerifyResponse> {
    return this.http
      .post<MfaVerifyResponse>(
        `${this.api}/api/Auth/mfa/verify`,
        { mfaPendingToken, code },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.store.setToken(res.accessToken, res.expiresIn)),
        catchError(this.handleError),
      );
  }

  confirmEmail(token: string): Observable<{ message: string }> {
    return this.http
      .get<{ message: string }>(`${this.api}/api/Auth/confirm-email`, { params: { token } })
      .pipe(catchError(this.handleError));
  }

  resendConfirmation(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/api/Auth/resend-confirmation`, { email })
      .pipe(catchError(this.handleError));
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http
      .post<ForgotPasswordResponse>(`${this.api}/api/Auth/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, nouveauMotDePasse: string): Observable<ResetPasswordResponse> {
    return this.http
      .post<ResetPasswordResponse>(`${this.api}/api/Auth/reset-password`, {
        token,
        nouveauMotDePasse,
      })
      .pipe(catchError(this.handleError));
  }

  getUserInfo(): Observable<UserInfo> {
    return this.http
      .get<UserInfo>(`${this.api}/api/Auth/userinfo`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/api/Auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.store.clear()),
        catchError(this.handleError),
      );
  }

  private handleError(err: HttpErrorResponse) {
    return throwError(() => err);
  }
}
