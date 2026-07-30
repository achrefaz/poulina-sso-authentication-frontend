import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { TokenStore } from 'shared-auth';
import type { UserInfo } from 'shared-auth';
import { environment } from '../../../environments/environment';

type MfaStep = 'idle' | 'qr' | 'verify-setup' | 'disable';
type AdminView = 'none' | 'list' | 'create' | 'audit' | 'sessions';

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
  roles: string[];
}

interface AuditLogEntry {
  id: string;
  email: string | null;
  action: string;
  categorie: string;
  ipAddress: string;
  dateHeure: string;
  succes: boolean;
  messageErreur: string | null;
}

interface SessionEntry {
  id: string;
  sessionId: string;
  email: string | null;
  ipAddress: string;
  userAgent: string;
  dateCreation: string;
  dateDerniereActivite: string;
  statut: string;
}

interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  isLoading = true; // Ajouté pour l'état de chargement
  loadError = '';
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ── MFA ───────────────────────────────────────────────────────────────────
  mfaEnabled = false;
  mfaStep: MfaStep = 'idle';
  mfaLoading = false;
  mfaError = '';
  mfaSuccess = '';
  qrCodeBase64 = '';
  manualSecret = '';
  otpAuthUri = '';
  setupCode = '';
  disableCode = '';

  // ── Gestion utilisateurs ──────────────────────────────────────────────────
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

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: AuditLogEntry[] = [];
  auditTotal = 0;
  auditPage = 1;
  auditPageSize = 20;
  auditTotalPages = 0;
  auditLoading = false;
  auditError = '';
  auditFilterAction = '';
  auditFilterDateDebut = '';
  auditFilterDateFin = '';

  readonly auditActions = [
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'LOGOUT_GLOBAL',
    'REGISTER',
    'REFRESH_TOKEN',
    'TOKEN_EXCHANGE',
    'MFA_SETUP',
    'MFA_VERIFY',
    'MFA_DISABLE',
    'EMAIL_VERIFIED',
    'CONFIRMATION_RESENT',
    'CREATE_USER',
    'BLOCK_USER',
    'UNBLOCK_USER',
    'CHANGE_PASSWORD',
    'CHANGE_PASSWORD_FAILED',
    'ASSIGN_ROLE',
    'REVOKE_ROLE',
    'CREATE_ROLE',
    'REVOKE_SESSION',
  ];

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions: SessionEntry[] = [];
  sessionsTotal = 0;
  sessionsPage = 1;
  sessionsPageSize = 20;
  sessionsTotalPages = 0;
  sessionsLoading = false;
  sessionsError = '';
  revokingSessionId = '';

  private readonly api = environment.apiUrl;

  // private readonly api = 'http://localhost:5095';

  constructor(
    private authService: AuthService,
    private tokenStore: TokenStore,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // Attendre que le token soit disponible
    this.loadUserInfoWithRetry();
  }

  /**
   * Charge les informations utilisateur avec tentative de refresh si nécessaire
   */
  private async loadUserInfoWithRetry(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      let token = this.tokenStore.getToken();

      if (!token) {
        try {
          const refreshResult = await this.authService.refresh().toPromise();
          token = this.tokenStore.getToken();
        } catch (refreshError) {
          this.router.navigate(['/login']);
          return;
        }
      }

      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      this.authService.getUserInfo().subscribe({
        next: (info) => {
          this.userInfo = info;
          this.mfaEnabled = (info as any)?.mfa_enabled ?? false;
          this.isLoading = false;
        },
        error: (err) => {
          this.loadError = 'Impossible de charger votre profil. Veuillez réessayer.';
          this.isLoading = false;

          // Si 401, rediriger vers login
          if (err.status === 401) {
            this.authService.redirectToSso();
          }
        },
      });
    } catch (error) {
      this.isLoading = false;
      this.loadError = 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  get initials(): string {
    if (!this.userInfo) return '?';
    return `${this.userInfo.given_name[0] ?? ''}${this.userInfo.family_name[0] ?? ''}`.toUpperCase();
  }

  get isAdmin(): boolean {
    return this.userInfo?.roles?.includes('ADMIN') ?? false;
  }

  // ... le reste du code (toutes les méthodes admin, mfa, etc.) reste identique ...

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

  openAuditLogs(): void {
    this.adminView = 'audit';
    this.auditError = '';
    this.auditPage = 1;
    this.loadAuditLogs();
  }

  openSessions(): void {
    this.adminView = 'sessions';
    this.sessionsError = '';
    this.sessionsPage = 1;
    this.loadSessions();
  }

  closeAdmin(): void {
    this.adminView = 'none';
    this.blockingUserId = '';
    this.blockRaison = '';
    this.blockError = '';
  }

  // ── Admin : charger utilisateurs ──────────────────────────────────────────
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
        next: () => {
          this.createSuccess = `Utilisateur ${this.newUser.email} créé. Les identifiants et le lien de confirmation ont été envoyés par email.`;
          this.newUser = { prenom: '', nom: '', email: '', password: '', roleIds: [] };
          this.createLoading = false;
        },
        error: (err) => {
          const errors = err?.error?.errors as { field: string; error: string }[] | undefined;
          this.createError = errors?.length
            ? errors.map((e) => e.error).join(' ')
            : (err?.error?.message ?? 'Erreur lors de la création.');
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
      }>(
        `${this.api}/api/User/admin/users/${user.id}/bloquer`,
        { raison: this.blockRaison },
        { withCredentials: true },
      )
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

  // ── Audit Logs ────────────────────────────────────────────────────────────
  loadAuditLogs(): void {
    this.auditLoading = true;
    this.auditError = '';

    const params: Record<string, string> = {
      page: String(this.auditPage),
      pageSize: String(this.auditPageSize),
    };
    if (this.auditFilterAction) params['action'] = this.auditFilterAction;
    if (this.auditFilterDateDebut) params['dateDebut'] = this.auditFilterDateDebut;
    if (this.auditFilterDateFin) params['dateFin'] = this.auditFilterDateFin;

    this.http
      .get<
        PagedResult<AuditLogEntry>
      >(`${this.api}/api/User/admin/audit-logs`, { params, withCredentials: true })
      .subscribe({
        next: (res) => {
          this.auditLogs = res.items;
          this.auditTotal = res.total;
          this.auditTotalPages = res.totalPages;
          this.auditLoading = false;
        },
        error: (err) => {
          this.auditError = err?.error?.message ?? 'Erreur chargement des logs.';
          this.auditLoading = false;
        },
      });
  }

  applyAuditFilters(): void {
    this.auditPage = 1;
    this.loadAuditLogs();
  }

  resetAuditFilters(): void {
    this.auditFilterAction = '';
    this.auditFilterDateDebut = '';
    this.auditFilterDateFin = '';
    this.auditPage = 1;
    this.loadAuditLogs();
  }

  auditPrevPage(): void {
    if (this.auditPage > 1) {
      this.auditPage--;
      this.loadAuditLogs();
    }
  }

  auditNextPage(): void {
    if (this.auditPage < this.auditTotalPages) {
      this.auditPage++;
      this.loadAuditLogs();
    }
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  loadSessions(): void {
    this.sessionsLoading = true;
    this.sessionsError = '';

    this.http
      .get<PagedResult<SessionEntry>>(`${this.api}/api/User/admin/sessions`, {
        params: { page: String(this.sessionsPage), pageSize: String(this.sessionsPageSize) },
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          this.sessions = res.items;
          this.sessionsTotal = res.total;
          this.sessionsTotalPages = res.totalPages;
          this.sessionsLoading = false;
        },
        error: (err) => {
          this.sessionsError = err?.error?.message ?? 'Erreur chargement des sessions.';
          this.sessionsLoading = false;
        },
      });
  }

  revokeSession(session: SessionEntry): void {
    this.revokingSessionId = session.id;
    this.http
      .patch<{
        message: string;
      }>(
        `${this.api}/api/User/admin/sessions/${session.id}/revoquer`,
        {},
        { withCredentials: true },
      )
      .subscribe({
        next: () => {
          session.statut = 'REVOQUEE';
          this.revokingSessionId = '';
        },
        error: (err) => {
          this.sessionsError = err?.error?.message ?? 'Erreur révocation session.';
          this.revokingSessionId = '';
        },
      });
  }

  sessionsPrevPage(): void {
    if (this.sessionsPage > 1) {
      this.sessionsPage--;
      this.loadSessions();
    }
  }

  sessionsNextPage(): void {
    if (this.sessionsPage < this.sessionsTotalPages) {
      this.sessionsPage++;
      this.loadSessions();
    }
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
      }>(
        `${this.api}/api/Auth/mfa/verify-setup`,
        { code: this.setupCode },
        { withCredentials: true },
      )
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

  // ── Utilitaires ───────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  shortUserAgent(ua: string): string {
    if (!ua) return '—';
    const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    return match ? match[0] : ua.slice(0, 40);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    this.isLoggingOut = true;
    try {
      await this.authService.logout().toPromise();
    } finally {
      this.tokenStore.clear();
      sessionStorage.removeItem('sso_roles');
      sessionStorage.removeItem('sso_tokens');
      // window.location.href = 'http://localhost:4200/login';
      window.location.href = `${environment.ssoUrl}/login`;
    }
  }
}
