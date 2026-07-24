import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { TokenStore } from 'shared-auth';
import { environment } from '../../../environments/environment';

const ROLE_PLATFORM_MAP: Record<string, string> = {
  RH_USER: environment.rhUrl,
  RH_ADMIN: environment.rhUrl,
  FINANCE_USER: environment.financeUrl,
  FINANCE_ADMIN: environment.financeUrl,
  DIRECTION: environment.dashboardUrl,
  ADMIN: environment.dashboardUrl,
};

// const ROLE_PLATFORM_MAP: Record<string, string> = {
//   RH_USER: 'http://localhost:3001',
//   RH_ADMIN: 'http://localhost:3001',
//   FINANCE_USER: 'http://localhost:3002',
//   FINANCE_ADMIN: 'http://localhost:3002',
//   DIRECTION: 'http://localhost:3003',
//   ADMIN: 'http://localhost:3003',
// };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LogoComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private store: TokenStore,
    private router: Router,
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.loginDirect(this.email, this.password).toPromise();

      if (!result) return;

      if (result.mfaRequired && result.mfaPendingToken) {
        this.router.navigate(['/mfa'], {
          queryParams: { pendingToken: result.mfaPendingToken },
        });
        return;
      }

      if (result.passwordChangeRequired && result.accessToken) {
        this.store.setToken(result.accessToken);
        this.router.navigate(['/change-password']);
        return;
      }

      if (result.accessToken) {
        this.store.setToken(result.accessToken, result.expiresIn);
        this.redirectByRoles(result.roles ?? []);
      }
    } catch (err: any) {
      const body = err?.error ?? {};

      if (body.errorCode === 'EMAIL_NOT_VERIFIED') {
        this.router.navigate(['/email-not-verified'], { queryParams: { email: this.email } });
        return;
      }

      if (body.errorCode === 'LOCKED') {
        this.errorMessage = 'Compte temporairement bloqué. Réessayez dans quelques minutes.';
      } else if (body.errorCode === 'DISABLED') {
        this.errorMessage = 'Ce compte est désactivé. Contactez votre administrateur.';
      } else if (body.errorCode === 'BLOCKED') {
        this.errorMessage = body.raison
          ? `Compte bloqué : ${body.raison}`
          : 'Compte bloqué. Contactez votre administrateur.';
      } else {
        this.errorMessage = body.message ?? 'Email ou mot de passe incorrect.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  private redirectByRoles(roles: string[]): void {
    const platforms = [...new Set(roles.map((r) => ROLE_PLATFORM_MAP[r]).filter(Boolean))];

    if (platforms.length === 0) {
      this.router.navigate(['/access-denied']);
      return;
    }

    if (platforms.length === 1) {
      window.location.href = platforms[0];
      return;
    }

    this.router.navigate(['/platform-select']);
  }
}
