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

  // ⚠️ CRUCIAL : Ces variables contrôlent le type des inputs
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

  // ── Règles exactes, alignées sur UserValidators.cs (backend) ────────────
  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }
  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }
  get hasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }
  get hasDigit(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get isPasswordValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasDigit;
  }

  get strength(): 'weak' | 'medium' | 'strong' {
    if (!this.hasMinLength) return 'weak';
    const score = [this.hasUppercase, this.hasLowercase, this.hasDigit].filter(Boolean).length;
    if (score === 3) return 'strong';
    if (score === 2) return 'medium';
    return 'weak';
  }

  get strengthLabel(): string {
    return { weak: 'Faible', medium: 'Moyen', strong: 'Fort' }[this.strength];
  }

  get canSubmit(): boolean {
    return !this.isLoading && this.isPasswordValid && this.newPassword === this.confirmPassword;
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    if (!this.hasMinLength) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (!this.hasUppercase) {
      this.errorMessage = 'Le mot de passe doit contenir au moins une majuscule.';
      return;
    }
    if (!this.hasLowercase) {
      this.errorMessage = 'Le mot de passe doit contenir au moins une minuscule.';
      return;
    }
    if (!this.hasDigit) {
      this.errorMessage = 'Le mot de passe doit contenir au moins un chiffre.';
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
      const errors = err?.error?.errors as { field: string; error: string }[] | undefined;
      this.errorMessage = errors?.length
        ? errors.map((e) => e.error).join(' ')
        : (err?.error?.message ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      this.isLoading = false;
    }
  }
}
