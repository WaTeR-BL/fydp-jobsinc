export enum UserRole {
  SUPER_ADMIN = 0,
  ADMIN = 1,
  MANAGER = 2,
  INTERVIEWER = 3,
}

export const ROLE_SLUG_MAP: Record<number, string> = {
  [UserRole.SUPER_ADMIN]: 'super_admin',
  [UserRole.ADMIN]: 'admin',
  [UserRole.MANAGER]: 'manager',
  [UserRole.INTERVIEWER]: 'interviewer',
};

export interface AuthUser {
  id?: string | number;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  roles?: number[];
  role?: number | string;
  isGoogleInitialized?: boolean;
  isGoogleExpired?: boolean;
  isLinkedInInitialized?: boolean;
  avatarUrl?: string;
  tenantName?: string;
  timezone?: string;
  tenantLogoUrl?: string;
  is2FAEnabled?: boolean;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  roles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
  name?: string;
  email?: string;
  roles?: number[];
}

// Login request with optional 2FA code
export interface LoginRequest {
  email: string;
  password: string;
  code?: string; // 6-digit TOTP code for 2FA
}

export interface RefreshRequest {
  refreshToken: string;
}

// Full success response (UserDetailDto)
export interface LoginSuccessResponse {
  name: string;
  email: string;
  roles: number[];
  accessToken: string;
  refreshToken: string;
  avatarUrl?: string;
  isGoogleInitialized?: boolean;
  isGoogleExpired?: boolean;
  isLinkedInInitialized?: boolean;
  tenantName?: string;
  timezone?: string;
  tenantLogoUrl?: string;
  is2FAEnabled?: boolean;
}

// 2FA code required response (user has 2FA set up)
export interface TwoFARequiredResponse {
  requires2FA: true;
  is2FAEnabled: true;
  email: string;
}

// 2FA setup required response (user needs to configure 2FA)
export interface TwoFASetupRequiredResponse {
  requiresSetup: true;
  is2FAEnabled: true;
  email: string;
}

// Union type for all login response variants
export type LoginResponseData =
  | LoginSuccessResponse
  | TwoFARequiredResponse
  | TwoFASetupRequiredResponse;

// 2FA initialization request
export interface Initialize2FARequest {
  email: string;
  password: string;
}

// 2FA initialization response with QR code
export interface Initialize2FAResponse {
  qrCode: string; // Base64 QR image
  email: string;
}

// 2FA verification request
export interface Verify2FARequest {
  email: string;
  password: string;
  code: string; // 6-digit TOTP code
}

// Applicant login response (no 2FA, no roles)
export interface ApplicantLoginResponse {
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

// Type guards for login response handling
export const isLoginSuccess = (data: LoginResponseData): data is LoginSuccessResponse => {
  return 'accessToken' in data && 'refreshToken' in data;
};

export const is2FARequired = (data: LoginResponseData): data is TwoFARequiredResponse => {
  return 'requires2FA' in data && data.requires2FA === true;
};

export const is2FASetupRequired = (data: LoginResponseData): data is TwoFASetupRequiredResponse => {
  return 'requiresSetup' in data && data.requiresSetup === true;
};
