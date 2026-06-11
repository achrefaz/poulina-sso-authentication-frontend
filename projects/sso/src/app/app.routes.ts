import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'mfa',
    loadComponent: () => import('./pages/mfa/mfa.component').then((m) => m.MfaComponent),
  },
  {
    path: 'email-not-verified',
    loadComponent: () =>
      import('./pages/email-not-verified/email-not-verified.component').then(
        (m) => m.EmailNotVerifiedComponent,
      ),
  },
  {
    path: 'confirm-email',
    loadComponent: () =>
      import('./pages/confirm-email/confirm-email.component').then((m) => m.ConfirmEmailComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
