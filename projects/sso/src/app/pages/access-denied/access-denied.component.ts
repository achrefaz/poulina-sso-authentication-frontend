import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

const CLIENT_INFO: Record<string, { label: string; roles: string[] }> = {
  'rh-client': { label: 'Plateforme RH', roles: ['RH_USER', 'RH_ADMIN'] },
  'finance-client': { label: 'Plateforme Finance', roles: ['FINANCE_USER', 'FINANCE_ADMIN'] },
  'dashboard-client': { label: 'Tableau de bord Direction', roles: ['DIRECTION', 'ADMIN'] },
};

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
})
export class AccessDeniedComponent implements OnInit {
  platformLabel = 'cette plateforme';
  requiredRoles: string[] = [];
  userRole = '';
  clientId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.clientId = params['clientId'] ?? '';
      this.userRole = params['userRole'] ?? '';

      const info = CLIENT_INFO[this.clientId];
      if (info) {
        this.platformLabel = info.label;
        this.requiredRoles = info.roles;
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  goToLogin(): void {
    const destinations: Record<string, string> = {
      RH_USER: 'http://localhost:3001',
      RH_ADMIN: 'http://localhost:3001',
      FINANCE_USER: 'http://localhost:3002',
      FINANCE_ADMIN: 'http://localhost:3002',
      DIRECTION: 'http://localhost:3003',
      ADMIN: 'http://localhost:3003',
    };

    const dest = destinations[this.userRole];
    if (dest) {
      window.location.href = dest;
    } else {
      window.history.back();
    }
  }
}
