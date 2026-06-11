import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

type Status = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [LogoComponent],
  templateUrl: './confirm-email.component.html',
  styleUrl: './confirm-email.component.scss',
})
export class ConfirmEmailComponent implements OnInit {
  status: Status = 'loading';
  message        = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status  = 'error';
      this.message = 'Lien de confirmation invalide ou incomplet.';
      return;
    }

    this.authService.confirmEmail(token).subscribe({
      next: (res) => {
        this.status  = 'success';
        this.message = res.message ?? 'Votre email a bien été confirmé.';
      },
      error: (err) => {
        this.status  = 'error';
        this.message = err?.error?.message ?? 'Ce lien est invalide ou a expiré.';
      },
    });
  }

  goToLogin(): void {
    window.location.href = '/login';
  }
}
