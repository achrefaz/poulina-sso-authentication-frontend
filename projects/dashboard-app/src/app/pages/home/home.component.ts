import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { TokenStore } from 'shared-auth';
import type { UserInfo } from 'shared-auth';

type MfaStep = 'idle' | 'qr' | 'verify-setup' | 'disable';
type AdminView = 'none' | 'list' | 'create';

interface AppRole {
  id: string;
  nom: string;
  description: string;
}
interface AppUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  statut: string;
  emailVerifie: boolean;
  dateCreation: string;
  dateDerniereConnexion: string | null;
  roles: { id: string; nom: string }[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userInfo: UserInfo | null = null;
  isLoggingOut = false;
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ── MFA ───────────────────────────────────────────────────────────────────
  mfaEnabled: boolean = false;
  mfaStep: MfaStep = 'idle';
  mfaLoading = false;
  mfaError = '';
  mfaSuccess = '';
  qrCodeBase64 = '';
  manualSecret = '';
  otpAuthUri = '';
  setupCode = '';
  disableCode = '';

  // ── Gestion utilisateurs ─────────────────────────────────────────────────
  adminView: AdminView = 'none';
  users: AppUser[] = [];
  roles: AppRole[] = [];
  usersLoading = false;
  usersError = '';

  // Formulaire création
  newUser = { prenom: '', nom: '', email: '', password: '', roleIds: [] as string[] };
  createLoading = false;
  createError = '';
  createSuccess = '';

  // Bloc/déblocage
  blockingUserId = '';
  blockRaison = '';
  blockLoading = false;
  blockError = '';

  private readonly api = 'http://localhost:5095';

  constructor(
    private authService: AuthService,
    private tokenStore: TokenStore,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.authService.getUserInfo().subscribe({
      next: (info) => {
        this.userInfo = info;
        this.mfaEnabled = (info as any)?.mfa_enabled ?? false;
      },
      error: (err) => console.error('Erreur chargement profil', err),
    });
  }

  get initials(): string {
    if (!this.userInfo) return '?';
    return `${this.userInfo.given_name[0] ?? ''}${this.userInfo.family_name[0] ?? ''}`.toUpperCase();
  }

  get isAdmin(): boolean {
    return this.userInfo?.roles?.includes('ADMIN') ?? false;
  }

  // ── Admin : navigation ────────────────────────────────────────────────────
  openUserList(): void {
    this.adminView = 'list';
    this.usersError = '';
    this.loadUsers();
  }

  openCreateUser(): void {
    this.adminView = 'create';
    this.createError = '';
    this.createSuccess = '';
    this.newUser = { prenom: '', nom: '', email: '', password: '', roleIds: [] };
    if (this.roles.length === 0) this.loadRoles();
  }

  closeAdmin(): void {
    this.adminView = 'none';
    this.blockingUserId = '';
    this.blockRaison = '';
    this.blockError = '';
  }

  // ── Admin : charger les données ───────────────────────────────────────────
  loadUsers(): void {
    this.usersLoading = true;
    this.http
      .get<AppUser[]>(`${this.api}/api/User/admin/users`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.users = res;
          this.usersLoading = false;
        },
        error: (err) => {
          this.usersError = err?.error?.message ?? 'Erreur chargement utilisateurs.';
          this.usersLoading = false;
        },
      });
  }

  loadRoles(): void {
    this.http
      .get<AppRole[]>(`${this.api}/api/User/admin/roles`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.roles = res;
        },
        error: () => {
          this.roles = [];
        },
      });
  }

  // ── Admin : créer utilisateur ─────────────────────────────────────────────
  toggleRole(roleId: string): void {
    const idx = this.newUser.roleIds.indexOf(roleId);
    if (idx === -1) this.newUser.roleIds.push(roleId);
    else this.newUser.roleIds.splice(idx, 1);
  }

  isRoleSelected(roleId: string): boolean {
    return this.newUser.roleIds.includes(roleId);
  }

  createUser(): void {
    this.createError = '';
    this.createSuccess = '';

    if (
      !this.newUser.email ||
      !this.newUser.password ||
      !this.newUser.nom ||
      !this.newUser.prenom
    ) {
      this.createError = 'Tous les champs sont requis.';
      return;
    }
    if (this.newUser.password.length < 8) {
      this.createError = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    this.createLoading = true;

    this.http
      .post<{ message: string; userId: string }>(
        `${this.api}/api/User/admin/users`,
        {
          email: this.newUser.email.trim().toLowerCase(),
          password: this.newUser.password,
          nom: this.newUser.nom,
          prenom: this.newUser.prenom,
          roleIds: this.newUser.roleIds,
        },
        { withCredentials: true },
      )
      .subscribe({
        next: (res) => {
          this.createSuccess = `Utilisateur ${this.newUser.email} créé avec succès. Un email de confirmation a été envoyé.`;
          this.newUser = { prenom: '', nom: '', email: '', password: '', roleIds: [] };
          this.createLoading = false;
        },
        error: (err) => {
          this.createError = err?.error?.message ?? 'Erreur lors de la création.';
          this.createLoading = false;
        },
      });
  }

  // ── Admin : bloquer / débloquer ───────────────────────────────────────────
  startBlock(userId: string): void {
    this.blockingUserId = userId;
    this.blockRaison = '';
    this.blockError = '';
  }

  cancelBlock(): void {
    this.blockingUserId = '';
    this.blockRaison = '';
    this.blockError = '';
  }

  confirmBlock(user: AppUser): void {
    if (!this.blockRaison.trim()) {
      this.blockError = 'La raison est requise.';
      return;
    }
    this.blockLoading = true;
    this.blockError = '';

    this.http
      .patch<{
        message: string;
      }>(`${this.api}/api/User/admin/users/${user.id}/bloquer`, { raison: this.blockRaison }, { withCredentials: true })
      .subscribe({
        next: () => {
          user.statut = 'BLOQUE';
          this.blockLoading = false;
          this.blockingUserId = '';
          this.blockRaison = '';
        },
        error: (err) => {
          this.blockError = err?.error?.message ?? 'Erreur lors du blocage.';
          this.blockLoading = false;
        },
      });
  }

  debloquer(user: AppUser): void {
    this.http
      .patch<{
        message: string;
      }>(`${this.api}/api/User/admin/users/${user.id}/debloquer`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          user.statut = 'ACTIF';
        },
        error: (err) => {
          this.blockError = err?.error?.message ?? 'Erreur déblocage.';
        },
      });
  }

  // ── MFA ───────────────────────────────────────────────────────────────────
  startMfaSetup(): void {
    this.mfaLoading = true;
    this.mfaError = '';
    this.mfaSuccess = '';

    this.http
      .post<{
        qrCodeBase64: string;
        manualSecret: string;
        otpAuthUri: string;
        message: string;
      }>(`${this.api}/api/Auth/mfa/setup`, {}, { withCredentials: true })
      .subscribe({
        next: (res) => {
          this.qrCodeBase64 = res.qrCodeBase64;
          this.manualSecret = res.manualSecret;
          this.otpAuthUri = res.otpAuthUri;
          this.mfaStep = 'qr';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Erreur lors de la génération du QR code.';
          this.mfaLoading = false;
        },
      });
  }

  confirmMfaSetup(): void {
    if (this.setupCode.length !== 6) {
      this.mfaError = 'Le code doit contenir 6 chiffres.';
      return;
    }
    this.mfaLoading = true;
    this.mfaError = '';

    this.http
      .post<{
        message: string;
      }>(`${this.api}/api/Auth/mfa/verify-setup`, { code: this.setupCode }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.mfaEnabled = true;
          this.mfaStep = 'idle';
          this.mfaSuccess = 'MFA activé avec succès.';
          this.setupCode = '';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Code invalide.';
          this.mfaLoading = false;
        },
      });
  }

  startMfaDisable(): void {
    this.mfaStep = 'disable';
    this.mfaError = '';
    this.mfaSuccess = '';
    this.disableCode = '';
  }

  confirmMfaDisable(): void {
    if (this.disableCode.length !== 6) {
      this.mfaError = 'Le code doit contenir 6 chiffres.';
      return;
    }
    this.mfaLoading = true;
    this.mfaError = '';

    this.http
      .post<{
        message: string;
      }>(`${this.api}/api/Auth/mfa/disable`, { code: this.disableCode }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.mfaEnabled = false;
          this.mfaStep = 'idle';
          this.mfaSuccess = 'MFA désactivé avec succès.';
          this.disableCode = '';
          this.mfaLoading = false;
        },
        error: (err) => {
          this.mfaError = err?.error?.message ?? 'Code invalide.';
          this.mfaLoading = false;
        },
      });
  }

  cancelMfa(): void {
    this.mfaStep = 'idle';
    this.mfaError = '';
    this.setupCode = '';
    this.disableCode = '';
    this.qrCodeBase64 = '';
  }

  onCodeInput(event: Event, field: 'setup' | 'disable'): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = clean;
    if (field === 'setup') this.setupCode = clean;
    if (field === 'disable') this.disableCode = clean;
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    this.isLoggingOut = true;
    try {
      await this.authService.logout().toPromise();
    } finally {
      this.tokenStore.clear();
      window.location.href = 'http://localhost:4200/login';
    }
  }
}
