import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');
    // console.log('code:', code);
    // console.log('state reçu:', state);
    // console.log('state sauvegardé:', sessionStorage.getItem('oauth_state'));
    // console.log('verifier:', sessionStorage.getItem('pkce_verifier'));

    if (!code || !state) {
      this.errorMessage = 'Paramètres de callback manquants.';
      return;
    }

    this.authService.exchangeCode(code, state).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        console.error('Échange code échoué', err);
        this.errorMessage = 'Échec de l\'authentification. Veuillez réessayer.';
      },
    });
  }

  retry(): void {
    this.authService.redirectToSso();
  }
}
