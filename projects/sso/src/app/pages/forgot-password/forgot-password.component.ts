import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  email = '';
  isLoading = false;
  sent = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  async onSubmit(): Promise<void> {
    if (!this.email) {
      this.errorMessage = 'Veuillez saisir votre email.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.forgotPassword(this.email).toPromise();
      // Toujours succès affiché, même si l'email n'existe pas (anti-énumération)
      this.sent = true;
    } catch {
      // Le backend répond toujours 200 sur cet endpoint, mais on garde
      // un filet de sécurité si erreur réseau/serveur.
      this.errorMessage = 'Une erreur est survenue. Réessayez plus tard.';
    } finally {
      this.isLoading = false;
    }
  }
}
