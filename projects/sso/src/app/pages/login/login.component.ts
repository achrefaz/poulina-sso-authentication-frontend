import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import type { OAuthParams } from 'shared-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  oauthParams: OAuthParams | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.oauthParams = this.authService.extractOAuthParams();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    if (!this.oauthParams) {
      this.errorMessage = 'Paramètres OAuth2 manquants. Accédez via une plateforme cliente.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService
        .loginWithCode(this.email, this.password, {
          clientId: this.oauthParams.clientId,
          redirectUri: this.oauthParams.redirectUri,
          state: this.oauthParams.state,
          codeChallenge: this.oauthParams.codeChallenge,
          codeChallengeMethod: this.oauthParams.codeChallengeMethod,
          scopes: this.oauthParams.scope,
        })
        .toPromise();

      if ((result as any)?.mfaRequired === true || (result as any)?.mfaPendingToken) {
        const pendingToken = (result as any).mfaPendingToken;
        this.router.navigate(['/mfa'], {
          queryParams: {
            pendingToken,
            clientId: this.oauthParams.clientId,
            redirectUri: this.oauthParams.redirectUri,
            state: this.oauthParams.state,
            codeChallenge: this.oauthParams.codeChallenge,
            codeChallengeMethod: this.oauthParams.codeChallengeMethod,
            scope: this.oauthParams.scope,
          },
        });
        // console.log('codeChallenge envoyé au MFA:', this.oauthParams.codeChallenge);
        return;
      }

      if ((result as any)?.redirectUri) {
        window.location.href = (result as any).redirectUri;
      }
    } catch (err: any) {
      const body = err?.error ?? {};

      if (body.errorCode === 'EMAIL_NOT_VERIFIED') {
        this.router.navigate(['/email-not-verified'], {
          queryParams: { email: this.email },
        });
        return;
      }

      if (body.mfaRequired || body.errorCode === 'MFA_REQUIRED') {
        const pendingToken = body.mfaPendingToken ?? body.accessToken;
        this.router.navigate(['/mfa'], {
          queryParams: {
            pendingToken,
            clientId: this.oauthParams!.clientId,
            redirectUri: this.oauthParams!.redirectUri,
            state: this.oauthParams!.state,
            codeChallenge: this.oauthParams!.codeChallenge,
            codeChallengeMethod: this.oauthParams!.codeChallengeMethod,
            scope: this.oauthParams!.scope,
          },
        });
        // console.log('codeChallenge envoyé au MFA:', this.oauthParams.codeChallenge);
        return;
      }

      if (body.error === 'access_denied') {
        this.router.navigate(['/access-denied'], {
          queryParams: {
            clientId: this.oauthParams?.clientId ?? '',
          },
        });
        return;
      }

      if (body.errorCode === 'LOCKED') {
        this.errorMessage = 'Compte temporairement bloqué. Réessayez dans quelques minutes.';
      } else if (body.errorCode === 'DISABLED') {
        this.errorMessage = 'Ce compte est désactivé. Contactez votre administrateur.';
      } else {
        this.errorMessage = body.message ?? 'Email ou mot de passe incorrect.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
