import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { environment } from '../../../environments/environment';

const ROLE_PLATFORM_MAP: Record<string, string> = {
  RH_USER: environment.rhUrl,
  RH_ADMIN: environment.rhUrl,
  FINANCE_USER: environment.financeUrl,
  FINANCE_ADMIN: environment.financeUrl,
  DIRECTION: environment.dashboardUrl,
  ADMIN: environment.dashboardUrl,
};

// const ROLE_PLATFORM_MAP: Record<string, string> = {
//   RH_USER: 'http://localhost:3001',
//   RH_ADMIN: 'http://localhost:3001',
//   FINANCE_USER: 'http://localhost:3002',
//   FINANCE_ADMIN: 'http://localhost:3002',
//   DIRECTION: 'http://localhost:3003',
//   ADMIN: 'http://localhost:3003',
// };

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.pendingToken = this.route.snapshot.queryParamMap.get('pendingToken') ?? '';
    if (!this.pendingToken) {
      this.router.navigate(['/login']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.code.length !== 6) {
      this.errorMessage = 'Le code doit contenir 6 chiffres.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.verifyMfa(this.pendingToken, this.code).toPromise();

      if (!result) return;

      this.redirectByRoles(result.roles ?? []);
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

  private redirectByRoles(roles: string[]): void {
    const platforms = [...new Set(roles.map((r) => ROLE_PLATFORM_MAP[r]).filter(Boolean))];

    if (platforms.length === 0) {
      this.router.navigate(['/access-denied']);
      return;
    }

    if (platforms.length === 1) {
      window.location.href = platforms[0];
      return;
    }

    this.router.navigate(['/platform-select']);
  }
}
