import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'mfa',
    loadComponent: () => import('./pages/mfa/mfa.component').then((m) => m.MfaComponent),
  },
  {
    path: 'platform-select',
    loadComponent: () =>
      import('./pages/platform-select/platform-select.component').then(
        (m) => m.PlatformSelectComponent,
      ),
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./pages/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
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
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./pages/access-denied/access-denied.component').then((m) => m.AccessDeniedComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
