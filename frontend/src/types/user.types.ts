import { UserRole } from './auth.types';

// User response from API
export interface User {
  id: string;
  fullName: string;
  emailAddress: string;
  roles: number[];
  status: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isGoogleInitialized?: boolean;
  isGoogleExpired?: boolean;
  tenantName?: string;
  tenantLogoUrl?: string;
  timezone?: string;
}

// Create user request payload
export interface CreateUserRequest {
  emailAddress: string;
  name: string;
  timezone?: string;
  password: string;
  enable2FA?: boolean;
  roles: UserRole[];
}

// Update current user profile request
export interface UpdateProfileRequest {
  name?: string;
  timezone?: string;
}

// Filter users request
export interface FilterUsersRequest {
  status?: string;
  userRole?: number[];
  page?: number;
  limit?: number;
}

// Password reset request (public endpoint)
export interface ResetPasswordRequest {
  token: string;
  email: string;
  newPassword: string;
}

// Paginated users response
export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}
