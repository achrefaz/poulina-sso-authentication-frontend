import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  SHARED_AUTH_CONFIG,
  TokenStore,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from 'shared-auth';
import type { TokenResponse, RefreshResponse, UserInfo } from 'shared-auth';

const SSO_URL = 'http://localhost:4200';
const CLIENT_ID = 'dashboard-client';
const REDIRECT_URI = 'http://localhost:3003/callback';
const SCOPES = 'openid profile email';
const KEY_VERIFIER = 'pkce_verifier';
const KEY_STATE = 'oauth_state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(TokenStore);
  private readonly config = inject(SHARED_AUTH_CONFIG);
  private get api(): string {
    return this.config.apiUrl;
  }

  async redirectToSso(): Promise<void> {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();

    sessionStorage.setItem(KEY_VERIFIER, verifier);
    sessionStorage.setItem(KEY_STATE, state);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${SSO_URL}/login?${params.toString()}`;
  }

  exchangeCode(code: string, returnedState: string): Observable<TokenResponse> {
    const verifier = sessionStorage.getItem(KEY_VERIFIER);
    const savedState = sessionStorage.getItem(KEY_STATE);

    if (!verifier) throw new Error('code_verifier manquant.');
    if (returnedState !== savedState) throw new Error('state invalide.');

    return this.http
      .post<TokenResponse>(
        `${this.api}/api/Auth/token`,
        {
          grantType: 'authorization_code',
          code,
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          codeVerifier: verifier,
        },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          sessionStorage.removeItem(KEY_VERIFIER);
          sessionStorage.removeItem(KEY_STATE);
          this.store.setToken(res.access_token, res.expires_in);
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  refresh(): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(
        `${this.api}/api/Auth/refresh`,
        { clientId: CLIENT_ID },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.store.setToken(res.accessToken, res.expiresIn)),
        catchError((err) => throwError(() => err)),
      );
  }

  getUserInfo(): Observable<UserInfo> {
    return this.http
      .get<UserInfo>(`${this.api}/api/Auth/userinfo`, { withCredentials: true })
      .pipe(catchError((err) => throwError(() => err)));
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.api}/api/Auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.store.clear()),
        catchError((err) => throwError(() => err)),
      );
  }
}
