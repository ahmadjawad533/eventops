import { UserProfile, UserRole } from './models';
import { RoleType } from './enums';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: UserProfile;
  roles: UserRole[];
  tokens: AuthTokens;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  roles?: RoleType[];
  interests?: string[];
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UpdateProfileDto {
  name?: string;
  interests?: string[];
  avatar_url?: string;
}

export interface AssignRoleDto {
  role_type: RoleType;
  org_id?: string;
}

export interface TicketPayload {
  registrationId: string;
  ticketCode: string;
  eventId: string;
  userId: string;
  signature: string;
}
