import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, LogoComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  success = false;
  errorMessage = '';
  tokenMissing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenMissing = true;
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';

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
      await this.authService.resetPassword(this.token, this.newPassword).toPromise();
      this.success = true;
    } catch (err: any) {
      const body = err?.error ?? {};

      if (body.errorCode === 'EXPIRED_TOKEN') {
        this.errorMessage = 'Ce lien a expiré. Veuillez refaire une demande de réinitialisation.';
      } else if (body.errorCode === 'INVALID_TOKEN') {
        this.errorMessage = 'Ce lien est invalide ou a déjà été utilisé.';
      } else {
        this.errorMessage = body.message ?? 'Une erreur est survenue.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
