import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { environment } from '../../../environments/environment';

interface Platform {
  name: string;
  description: string;
  url: string;
  roles: string[];
  icon: 'rh' | 'finance' | 'dashboard';
}

const ALL_PLATFORMS: Platform[] = [
  {
    name: 'Ressources Humaines',
    description: '...',
    url: environment.rhUrl,
    roles: ['RH_USER', 'RH_ADMIN'],
    icon: 'rh',
  },
  {
    name: 'Finance',
    description: '...',
    url: environment.financeUrl,
    roles: ['FINANCE_USER', 'FINANCE_ADMIN'],
    icon: 'finance',
  },
  {
    name: 'Direction & Administration',
    description: '...',
    url: environment.dashboardUrl,
    roles: ['DIRECTION', 'ADMIN'],
    icon: 'dashboard',
  },
];

// const ALL_PLATFORMS: Platform[] = [
//   {
//     name: 'Ressources Humaines',
//     description: 'Gestion des collaborateurs, congés, paie et recrutement.',
//     url: 'http://localhost:3001',
//     roles: ['RH_USER', 'RH_ADMIN'],
//     icon: 'rh',
//   },
//   {
//     name: 'Finance',
//     description: 'Tableaux de bord financiers, budgets et reporting.',
//     url: 'http://localhost:3002',
//     roles: ['FINANCE_USER', 'FINANCE_ADMIN'],
//     icon: 'finance',
//   },
//   {
//     name: 'Direction & Administration',
//     description: 'Vue consolidée, gestion des accès et audit système.',
//     url: 'http://localhost:3003',
//     roles: ['DIRECTION', 'ADMIN'],
//     icon: 'dashboard',
//   },
// ];

@Component({
  selector: 'app-platform-select',
  standalone: true,
  imports: [LogoComponent],
  templateUrl: './platform-select.component.html',
  styleUrl: './platform-select.component.scss',
})
export class PlatformSelectComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  availablePlatforms: Platform[] = [];
  loading = true;

  ngOnInit(): void {
    this.authService.fetchCurrentRoles().subscribe({
      next: (roles) => {
        if (roles.length === 0) {
          this.router.navigate(['/login']);
          return;
        }

        this.availablePlatforms = ALL_PLATFORMS.filter((p) =>
          p.roles.some((r) => roles.includes(r)),
        );

        if (this.availablePlatforms.length === 0) {
          this.router.navigate(['/access-denied']);
          return;
        }

        this.loading = false;
      },
      error: () => this.router.navigate(['/login']),
    });
  }


  goTo(url: string): void {
    window.location.href = url;
  }
}
