import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule, LogoComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  showNew = false;
  showConfirm = false;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Token temporaire pour appeler change-password
  private accessToken = '';

  // Tous les params OAuth2 conservés pour relancer le flow après succès
  private clientId = '';
  private redirectUri = '';
  private state = '';
  private codeChallenge = '';
  private codeChallengeMethod = '';
  private scope = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    const p = this.route.snapshot.queryParamMap;
    this.accessToken = p.get('accessToken') ?? '';
    this.clientId = p.get('clientId') ?? '';
    this.redirectUri = p.get('redirectUri') ?? '';
    this.state = p.get('state') ?? '';
    this.codeChallenge = p.get('codeChallenge') ?? '';
    this.codeChallengeMethod = p.get('codeChallengeMethod') ?? 'S256';
    this.scope = p.get('scope') ?? 'openid profile email';
  }

  toggleNew(): void {
    this.showNew = !this.showNew;
  }
  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  get strength(): 'weak' | 'medium' | 'strong' {
    const p = this.newPassword;
    if (p.length < 8) return 'weak';
    const score = [/[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    if (score >= 2) return 'strong';
    if (score === 1) return 'medium';
    return 'weak';
  }

  get strengthLabel(): string {
    return { weak: 'Faible', medium: 'Moyen', strong: 'Fort' }[this.strength];
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isLoading = true;

    try {
      await this.http
        .post(
          `${environment.apiUrl}/api/User/change-password`,
          {
            nouveauMotDePasse: this.newPassword,
            confirmationMotDePasse: this.confirmPassword,
          },
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
            withCredentials: true,
          },
        )
        .toPromise();

      this.successMessage = 'Mot de passe défini. Redirection vers la connexion…';

      // Après succès : relancer le flow OAuth2 complet depuis le SSO login.
      // Le mot de passe a été changé, DoitChangerMotDePasse = false,
      // donc cette fois le login se terminera normalement avec un code OAuth2.
      setTimeout(() => {
        const params = new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: this.redirectUri,
          response_type: 'code',
          scope: this.scope,
          state: this.state,
          code_challenge: this.codeChallenge,
          code_challenge_method: this.codeChallengeMethod,
        });
        window.location.href = `/login?${params.toString()}`;
      }, 1500);
    } catch (err: any) {
      this.errorMessage = err?.error?.message ?? 'Erreur lors du changement de mot de passe.';
    } finally {
      this.isLoading = false;
    }
  }
}
