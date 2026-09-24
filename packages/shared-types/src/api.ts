import { UserProfile, UserRole } from './models';

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

export interface TicketPayload {
  registrationId: string;
  ticketCode: string;
  eventId: string;
  userId: string;
  signature: string;
}
