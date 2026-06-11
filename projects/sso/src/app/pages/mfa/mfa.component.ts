import { Component, OnInit } from '@angular/core';
import { FormsModule, } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [FormsModule, LogoComponent],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.scss',
})
export class MfaComponent implements OnInit {
  code = '';
  isLoading = false;
  errorMessage = '';
  pendingToken = '';

  private clientId = '';
  private redirectUri = '';
  private state: string | null = null;
  private codeChallenge = '';
  private codeChallengeMethod = '';
  private scope = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const p = this.route.snapshot.queryParamMap;
    this.pendingToken = p.get('pendingToken') ?? '';
    this.clientId = p.get('clientId') ?? '';
    this.redirectUri = p.get('redirectUri') ?? '';
    this.state = p.get('state');
    this.codeChallenge = p.get('codeChallenge') ?? '';
    this.codeChallengeMethod = p.get('codeChallengeMethod') ?? 'S256';
    this.scope = p.get('scope') ?? 'openid profile email';
  }

  async onSubmit(): Promise<void> {
    if (this.code.length !== 6) {
      this.errorMessage = 'Le code doit contenir 6 chiffres.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService
        .verifyMfa(this.pendingToken, this.code, {
          clientId: this.clientId,
          redirectUri: this.redirectUri,
          state: this.state,
          codeChallenge: this.codeChallenge,
          codeChallengeMethod: this.codeChallengeMethod,
          scopes: this.scope,
        })
        .toPromise();

      if (result?.redirectUri) {
        window.location.href = result.redirectUri;
      } else {
        this.errorMessage = 'Erreur inattendue. Veuillez réessayer.';
      }
    } catch (err: any) {
      this.errorMessage = err?.error?.message ?? 'Code incorrect ou expiré.';
    } finally {
      this.isLoading = false;
    }
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = clean;
    this.code = clean;
  }
}
