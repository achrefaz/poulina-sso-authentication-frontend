import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TokenStore } from 'shared-auth';
import type { OAuthParams, LoginWithCodeResponse, UserInfo } from 'shared-auth';
import { environment } from '../../../environments/environment';

export type { OAuthParams, UserInfo };

interface LoginWithCodePayload {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes: string;
}

interface MfaVerifyPayload {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TokenStore);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  // ── OAuth2 params depuis la query string ──────────────────────────────────

  extractOAuthParams(): OAuthParams | null {
    const p = new URLSearchParams(window.location.search);
    const clientId = p.get('client_id');
    const redirectUri = p.get('redirect_uri');
    const codeChallenge = p.get('code_challenge');
    const codeChallengeMethod = p.get('code_challenge_method');

    if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) return null;

    return {
      clientId,
      redirectUri,
      responseType: p.get('response_type') ?? 'code',
      scope: p.get('scope') ?? 'openid profile email',
      state: p.get('state'),
      codeChallenge,
      codeChallengeMethod,
    };
  }

  // ── Login OAuth2 ──────────────────────────────────────────────────────────

  loginWithCode(
    email: string,
    password: string,
    params: LoginWithCodePayload,
  ): Observable<LoginWithCodeResponse> {
    return this.http
      .post<LoginWithCodeResponse>(
        `${this.api}/api/Auth/login-with-code`,
        {
          email,
          password,
          clientId: params.clientId,
          redirectUri: params.redirectUri,
          state: params.state,
          codeChallenge: params.codeChallenge,
          codeChallengeMethod: params.codeChallengeMethod,
          scopes: params.scopes,
        },
        { withCredentials: true },
      )
      .pipe(catchError(this.handleError));
  }

  // ── MFA verify — valide le code TOTP et retourne redirectUri avec code OAuth2 ──

  verifyMfa(
    mfaPendingToken: string,
    code: string,
    params: MfaVerifyPayload,
  ): Observable<{ redirectUri: string }> {
    return this.http
      .post<{ redirectUri: string }>(
        `${this.api}/api/Auth/mfa/verify`,
        {
          mfaPendingToken,
          code,
          clientId: params.clientId,
          redirectUri: params.redirectUri,
          state: params.state,
          codeChallenge: params.codeChallenge,
          codeChallengeMethod: params.codeChallengeMethod,
          scopes: params.scopes,
        },
        { withCredentials: true },
      )
      .pipe(catchError(this.handleError));
  }

  // ── Email ─────────────────────────────────────────────────────────────────

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

  // ── UserInfo & Logout ─────────────────────────────────────────────────────

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
