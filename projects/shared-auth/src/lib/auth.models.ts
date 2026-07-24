export interface OAuthParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface LoginDirectResponse {
  accessToken?: string;
  expiresIn?: number;
  tokenType?: string;
  userId?: string;
  roles?: string[];
  mfaRequired?: boolean;
  mfaPendingToken?: string;
  passwordChangeRequired?: boolean;
  emailVerified?: boolean;
  message?: string;
}

export interface MfaVerifyResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  roles: string[];
  userId: string;
}

export interface ApiError {
  message?: string;
  errorCode?: string;
  raison?: string;
  error?: string;
  error_description?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  name: string;
  roles: string[];
  statut: string;
  email_verified: boolean;
  pwd_change_required: boolean;
  mfa_enabled: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}
