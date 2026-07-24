import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { TokenStore } from 'shared-auth';
import type { UserInfo } from 'shared-auth';
import { environment } from '../../../environments/environment';

type MfaStep = 'idle' | 'qr' | 'verify-setup' | 'disable';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userInfo: UserInfo | null = null;
  isLoggingOut = false;
  isLoading = true;
  loadError = '';
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  mfaEnabled = false;
  mfaStep: MfaStep = 'idle';
  mfaLoading = false;
  mfaError = '';
  mfaSuccess = '';

  qrCodeBase64 = '';
  manualSecret = '';
  otpAuthUri = '';

  setupCode = '';
  disableCode = '';

  private readonly api = environment.apiUrl;

  // private readonly api = 'http://localhost:5095';

  constructor(
    private authService: AuthService,
    private tokenStore: TokenStore,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadUserInfoWithRetry();
  }

  /**
   * Charge les informations utilisateur avec tentative de refresh si nécessaire
   */
  private async loadUserInfoWithRetry(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      let token = this.tokenStore.getToken();
      if (!token) {
        try {
          await this.authService.refresh().toPromise();
          token = this.tokenStore.getToken();
        } catch (refreshError) {
          this.isLoading = false;
          this.loadError = 'Impossible de se connecter. Veuillez réessayer.';
          return;
        }
      }

      if (!token) {
        this.isLoading = false;
        this.router.navigate(['/login']);
        return;
      }

      this.authService.getUserInfo().subscribe({
        next: (info) => {
          this.userInfo = info;
          this.mfaEnabled = (info as any)?.mfa_enabled ?? false;
          this.isLoading = false;
        },
        error: (err) => {
          this.loadError = 'Impossible de charger votre profil. Veuillez réessayer.';
          this.isLoading = false;

          if (err.status === 401) {
            this.authService.redirectToSso();
          }
        },
      });
    } catch (error) {
      this.isLoading = false;
      this.loadError = 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  get initials(): string {
    if (!this.userInfo) return '?';
    return `${this.userInfo.given_name[0] ?? ''}${this.userInfo.family_name[0] ?? ''}`.toUpperCase();
  }

  startMfaSetup(): void {
    this.mfaLoading = true;
    this.mfaError = '';
    this.mfaSuccess = '';

    this.http
      .post<{
        qrCodeBase64: string;
        manualSecret: string;
        otpAuthUri: string;
        message: string;
      }>(`${this.api}/api/Auth/mfa/setup`, {}, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.qrCodeBase64 = res.qrCodeBase64;
          this.manualSecret = res.manualSecret;
          this.otpAuthUri = res.otpAuthUri;
          this.mfaStep = 'qr';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Erreur lors de la génération du QR code.';
          this.mfaLoading = false;
        },
      });
  }

  confirmMfaSetup(): void {
    if (this.setupCode.length !== 6) {
      this.mfaError = 'Le code doit contenir 6 chiffres.';
      return;
    }
    this.mfaLoading = true;
    this.mfaError = '';

    this.http
      .post<{
        message: string;
      }>(
        `${this.api}/api/Auth/mfa/verify-setup`,
        { code: this.setupCode },
        { withCredentials: true },
      )
      .subscribe({
        next: () => {
          this.mfaEnabled = true;
          this.mfaStep = 'idle';
          this.mfaSuccess = 'MFA activé avec succès. Votre compte est maintenant protégé.';
          this.setupCode = '';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Code invalide. Réessayez.';
          this.mfaLoading = false;
        },
      });
  }

  startMfaDisable(): void {
    this.mfaStep = 'disable';
    this.mfaError = '';
    this.mfaSuccess = '';
    this.disableCode = '';
  }

  confirmMfaDisable(): void {
    if (this.disableCode.length !== 6) {
      this.mfaError = 'Le code doit contenir 6 chiffres.';
      return;
    }
    this.mfaLoading = true;
    this.mfaError = '';

    this.http
      .post<{
        message: string;
      }>(`${this.api}/api/Auth/mfa/disable`, { code: this.disableCode }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.mfaEnabled = false;
          this.mfaStep = 'idle';
          this.mfaSuccess = 'MFA désactivé avec succès.';
          this.disableCode = '';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Code invalide. Réessayez.';
          this.mfaLoading = false;
        },
      });
  }

  cancelMfa(): void {
    this.mfaStep = 'idle';
    this.mfaError = '';
    this.setupCode = '';
    this.disableCode = '';
    this.qrCodeBase64 = '';
  }

  onCodeInput(event: Event, field: 'setup' | 'disable'): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = clean;
    if (field === 'setup') this.setupCode = clean;
    if (field === 'disable') this.disableCode = clean;
  }

  async logout(): Promise<void> {
    this.isLoggingOut = true;
    try {
      await this.authService.logout().toPromise();
    } finally {
      this.tokenStore.clear();
      sessionStorage.removeItem('sso_roles');
      sessionStorage.removeItem('sso_tokens');
      // window.location.href = 'http://localhost:4200/login';
      window.location.href = `${environment.ssoUrl}/login`;
    }
  }
}
