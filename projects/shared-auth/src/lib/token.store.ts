import { Injectable, signal } from '@angular/core';

/**
 * Access token stocké UNIQUEMENT en mémoire — jamais localStorage.
 * Au rechargement de page, le refresh silencieux via cookie HttpOnly prend le relais.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly _accessToken = signal<string | null>(null);
  private expiresAt: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  readonly accessToken = this._accessToken.asReadonly();

  setToken(token: string, expiresInSeconds?: number): void {
    this._accessToken.set(token);
    if (expiresInSeconds) {
      this.expiresAt = Date.now() + expiresInSeconds * 1000;
    } else {
      const payload = this.decode(token);
      this.expiresAt = payload?.['exp'] ? (payload['exp'] as number) * 1000 : null;
    }
  }

  getToken(): string | null {
    return this._accessToken();
  }

  /** Token présent et non expiré (marge de 10 s) */
  isAuthenticated(): boolean {
    const token = this._accessToken();
    if (!token) {
      return false;
    }

    if (this.isExpired()) {
      return false;
    }
    return true;
  }

  isExpired(): boolean {
    return this.expiresAt !== null && Date.now() >= this.expiresAt - 10_000;
  }

  clear(): void {
    this._accessToken.set(null);
    this.expiresAt = null;
    this.refreshPromise = null;
  }

  /** Décode le payload JWT (usage UI uniquement — pas de vérification de signature) */
  decode(token?: string): Record<string, unknown> | null {
    const t = token ?? this._accessToken();
    if (!t) return null;
    try {
      const payload = t.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // Méthode pour l'AuthService
  setRefreshPromise(promise: Promise<string | null>): void {
    this.refreshPromise = promise;
  }

  getRefreshPromise(): Promise<string | null> | null {
    return this.refreshPromise;
  }

  clearRefreshPromise(): void {
    this.refreshPromise = null;
  }
}
