import { UserProfile, UserRole, Collaboration, CollaborationMessage, CollaborationTask } from './models';
import {
  RoleType,
  OrganizationType,
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
  CollaborationType,
  CollaborationStatus,
} from './enums';

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

export interface CreateOrganizationDto {
  name: string;
  type: OrganizationType;
  description?: string;
  website?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  website?: string;
}

export interface VerifyOrganizationDto {
  verified: boolean;
}

export interface AssignCommunityAdminDto {
  user_id: string;
}

export interface TicketPayload {
  registrationId: string;
  ticketCode: string;
  eventId: string;
  userId: string;
  signature: string;
}

export interface CreateEventDto {
  organizer_org_id: string;
  title: string;
  description: string;
  category: EventCategory;
  format: EventFormat;
  start_date: string;
  end_date: string;
  location?: string;
  capacity: number;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  category?: EventCategory;
  format?: EventFormat;
  start_date?: string;
  end_date?: string;
  location?: string;
  capacity?: number;
  status?: EventStatus;
}

export interface CheckInDto {
  qrPayload?: string;
  ticketCode?: string;
  targetStatus?: RegistrationStatus;
}

export interface CertificateVerification {
  valid: boolean;
  message?: string;
  certificate?: {
    verification_id: string;
    issued_at: string;
    attendee_name: string;
    attendee_email: string;
    event_title: string;
    event_date: string;
    event_location?: string | null;
    organizer_name: string;
  };
}

export interface ProposeCollaborationDto {
  event_id: string;
  requesting_org_id: string;
  target_org_id: string;
  collab_type: CollaborationType;
  initial_message: string;
}

export interface RespondCollaborationDto {
  action: 'accept' | 'reject' | 'counter';
  message?: string;
}

export interface SendCollaborationMessageDto {
  sender_org_id: string;
  body: string;
  is_counterproposal?: boolean;
}

export interface CreateCollaborationTaskDto {
  title: string;
  description?: string;
  assigned_org_id?: string;
}

export interface UpdateCollaborationTaskDto {
  title?: string;
  description?: string;
  assigned_org_id?: string;
  completed?: boolean;
}

export interface CollaborationWorkspaceResponse {
  collaboration: Collaboration;
  tasks: CollaborationTask[];
  messages: CollaborationMessage[];
}

export interface CreateOutreachRequestDto {
  requesting_org_id: string;
  target_community_org_id: string;
  event_id: string;
  purpose: string;
  target_audience: string;
  requested_recipient_count: number;
  message_subject: string;
  message_body: string;
}

export interface ReviewOutreachRequestDto {
  action: 'approve' | 'approve_with_edits' | 'reject' | 'needs_info';
  message_subject?: string;
  message_body?: string;
  notes?: string;
}

export interface SimulateActivityDto {
  opens?: number;
  clicks?: number;
  registrations?: number;
}
