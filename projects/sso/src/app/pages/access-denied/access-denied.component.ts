import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

const CLIENT_INFO: Record<string, { label: string; roles: string[] }> = {
  'rh-client': { label: 'Plateforme RH', roles: ['RH_USER', 'RH_ADMIN'] },
  'finance-client': { label: 'Plateforme Finance', roles: ['FINANCE_USER', 'FINANCE_ADMIN'] },
  'dashboard-client': { label: 'Tableau de bord Direction', roles: ['DIRECTION', 'ADMIN'] },
};

// const ROLE_PLATFORM_MAP: Record<string, string> = {
//   RH_USER: 'http://localhost:3001',
//   RH_ADMIN: 'http://localhost:3001',
//   FINANCE_USER: 'http://localhost:3002',
//   FINANCE_ADMIN: 'http://localhost:3002',
//   DIRECTION: 'http://localhost:3003',
//   ADMIN: 'http://localhost:3003',
// };

const ROLE_PLATFORM_MAP: Record<string, string> = {
  RH_USER: environment.rhUrl,
  RH_ADMIN: environment.rhUrl,
  FINANCE_USER: environment.financeUrl,
  FINANCE_ADMIN: environment.financeUrl,
  DIRECTION: environment.dashboardUrl,
  ADMIN: environment.dashboardUrl,
};

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
})
export class AccessDeniedComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  platformLabel = 'cette plateforme';
  requiredRoles: string[] = [];
  userRoles: string[] = [];
  clientId = '';
  accessiblePlatforms: { label: string; url: string }[] = [];
  hasRoles = false;
  loading = true;

  ngOnInit(): void {
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';

    const info = CLIENT_INFO[this.clientId];
    if (info) {
      this.platformLabel = info.label;
      this.requiredRoles = info.roles;
    }

    this.authService.fetchCurrentRoles().subscribe({
      next: (roles) => {
        this.userRoles = roles;
        this.hasRoles = roles.length > 0;
        this.computeAccessiblePlatforms();
        this.loading = false;
      },
      error: () => {

        this.userRoles = [];
        this.hasRoles = false;
        this.loading = false;
      },
    });
  }

  private computeAccessiblePlatforms(): void {
    const seen = new Set<string>();
    this.accessiblePlatforms = this.userRoles
      .map((r) => ROLE_PLATFORM_MAP[r])
      .filter((url): url is string => !!url && !seen.has(url) && !!seen.add(url))
      .map((url) => ({ url, label: this.getLabelForUrl(url) }));
  }

  private getLabelForUrl(url: string): string {
    if (url.includes('3001')) return 'Ressources Humaines';
    if (url.includes('3002')) return 'Finance';
    if (url.includes('3003')) return 'Direction & Administration';
    return url;
  }

  goToPlatform(url: string): void {
    window.location.href = url;
  }

  goBack(): void {
    if (this.accessiblePlatforms.length === 1) {
      window.location.href = this.accessiblePlatforms[0].url;
    } else if (this.accessiblePlatforms.length > 1) {
      // window.location.href = 'http://localhost:4200/platform-select';
      window.location.href = `${environment.ssoUrl}/platform-select`;    } else {
      this.goToLogin();
    }
  }

  goToLogin(): void {
    // window.location.href = 'http://localhost:4200/login';
    window.location.href = `${environment.ssoUrl}/login`;
  }
}
