import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { environment } from '../../../environments/environment';
import { TokenStore } from 'shared-auth';

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
  inputTypeNew = 'password';
  inputTypeConfirm = 'password';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private http: HttpClient,
    private store: TokenStore,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.store.getToken()) {
      this.router.navigate(['/login']);
    }
  }

  toggleNew(): void {
    this.showNew = !this.showNew;
    this.inputTypeNew = this.showNew ? 'text' : 'password';
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
    this.inputTypeConfirm = this.showConfirm ? 'text' : 'password';
  }

  onPasswordInput(): void {
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

    const token = this.store.getToken();
    if (!token) {
      this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.router.navigate(['/login']);
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
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        )
        .toPromise();

      this.successMessage = 'Mot de passe défini. Redirection vers la connexion…';

      setTimeout(() => {
        this.store.clear();
        this.router.navigate(['/login']);
      }, 1500);
    } catch (err: any) {
      this.errorMessage = err?.error?.message ?? 'Erreur lors du changement de mot de passe.';
    } finally {
      this.isLoading = false;
    }
  }
}
