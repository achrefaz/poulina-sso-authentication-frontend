import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-email-not-verified',
  standalone: true,
  imports: [LogoComponent],
  templateUrl: './email-not-verified.component.html',
  styleUrl: './email-not-verified.component.scss',
})
export class EmailNotVerifiedComponent implements OnInit {
  email        = '';
  isSending    = false;
  sent         = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
  }

  async resend(): Promise<void> {
    if (!this.email) return;
    this.isSending    = true;
    this.errorMessage = '';

    try {
      await this.authService.resendConfirmation(this.email).toPromise();
      this.sent = true;
    } catch (err: any) {
      this.errorMessage = err?.error?.message ?? 'Erreur lors de l\'envoi. Réessayez plus tard.';
    } finally {
      this.isSending = false;
    }
  }

  backToLogin(): void {
    history.back();
  }
}
