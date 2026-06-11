export interface OAuthParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface LoginResponse {
  accessToken?: string;
  expiresIn?: number;
  tokenType?: string;
  userId?: string;
  passwordChangeRequired?: boolean;
  mfaRequired?: boolean;
  mfaPendingToken?: string;
  message?: string;
}

export interface ApiError {
  message?: string;
  errorCode?: string;
  raison?: string;
  error?: string;
  error_description?: string;
}

export interface LoginWithCodeResponse {
  authorizationCode: string;
  redirectUri: string;
}

export interface MfaVerifyResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  userId: string;
  passwordChangeRequired?: boolean;
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
