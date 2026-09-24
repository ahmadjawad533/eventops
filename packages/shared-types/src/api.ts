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
  SponsorshipStatus,
  VenueRequestStatus,
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

export interface CreateSponsorshipOpportunityDto {
  event_id: string;
  title: string;
  needs: Record<string, any>;
  budget_range?: string;
}

export interface ApplySponsorshipDto {
  sponsor_org_id: string;
  notes?: string;
}

export interface UpdateSponsorshipApplicationStatusDto {
  status: SponsorshipStatus;
  notes?: string;
}

export interface CreateVenueDto {
  owner_org_id: string;
  name: string;
  capacity: number;
  facilities: Record<string, any>;
  city: string;
}

export interface CreateVenueRequestDto {
  venue_id: string;
  event_id: string;
  requesting_org_id: string;
  notes?: string;
}

export interface RespondVenueRequestDto {
  action: 'accept' | 'reject' | 'counter';
  notes?: string;
}

export interface OrganizerDashboardMetrics {
  summary: {
    total_events: number;
    published_events: number;
    draft_events: number;
    completed_events: number;
    cancelled_events: number;
    total_registrations: number;
    total_attended: number;
    average_attendance_rate: number;
    total_collaborations: number;
    total_sponsorships_confirmed: number;
  };
  events_breakdown: Array<{
    id: string;
    title: string;
    status: EventStatus;
    start_date: string;
    capacity: number;
    registered_count: number;
    attended_count: number;
    attendance_rate: number;
    remaining_capacity: number;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    target_type: string;
    target_id: string;
    created_at: string;
    metadata?: any;
  }>;
}

export interface CommunityDashboardMetrics {
  summary: {
    member_count: number;
    follower_count: number;
    total_outreach_campaigns: number;
    total_outreach_delivered: number;
    total_outreach_opened: number;
    total_outreach_clicked: number;
    total_outreach_registrations: number;
    average_open_rate: number;
    average_click_rate: number;
    conversion_rate: number;
  };
  campaigns_breakdown: Array<{
    id: string;
    outreach_request_id: string;
    purpose: string;
    target_audience: string;
    requesting_org_name: string;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    registrations_count: number;
    open_rate: number;
    click_rate: number;
    created_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    target_type: string;
    target_id: string;
    created_at: string;
    metadata?: any;
  }>;
}

export interface AuditLogItem {
  id: string;
  actor_user_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
}


