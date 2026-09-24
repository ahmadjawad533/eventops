import {
  RoleType,
  OrganizationType,
  OrgMemberRole,
  EventFormat,
  EventStatus,
  EventCategory,
  RegistrationStatus,
  CollaborationType,
  CollaborationStatus,
  OutreachStatus,
  SponsorshipStatus,
  VenueRequestStatus,
} from './enums';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  interests?: string[];
  avatar_url?: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  org_id?: string | null;
  role_type: RoleType;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  verified: boolean;
  description?: string | null;
  website?: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role_in_org: OrgMemberRole;
  joined_at: string;
  user?: UserProfile;
}

export interface CommunityFollower {
  id: string;
  community_org_id: string;
  user_id: string;
  followed_at: string;
}

export interface Event {
  id: string;
  organizer_org_id: string;
  title: string;
  description: string;
  category: EventCategory;
  format: EventFormat;
  start_date: string;
  end_date: string;
  location?: string | null;
  capacity: number;
  status: EventStatus;
  created_at: string;
  organizer?: Organization;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  status: RegistrationStatus;
  registered_at: string;
  checked_in_at?: string | null;
  event?: Event;
  user?: UserProfile;
}

export interface Certificate {
  id: string;
  registration_id: string;
  verification_id: string;
  issued_at: string;
  registration?: EventRegistration;
}

export interface Collaboration {
  id: string;
  event_id: string;
  requesting_org_id: string;
  target_org_id: string;
  collab_type: CollaborationType;
  status: CollaborationStatus;
  created_at: string;
  event?: Event;
  requesting_org?: Organization;
  target_org?: Organization;
  messages?: CollaborationMessage[];
  tasks?: CollaborationTask[];
}

export interface CollaborationMessage {
  id: string;
  collaboration_id: string;
  sender_org_id: string;
  body: string;
  is_counterproposal: boolean;
  created_at: string;
  sender_org?: Organization;
}

export interface CollaborationTask {
  id: string;
  collaboration_id: string;
  title: string;
  description?: string | null;
  assigned_org_id?: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  assigned_org?: Organization;
}

export interface OutreachRequest {
  id: string;
  requesting_org_id: string;
  target_community_org_id: string;
  event_id: string;
  purpose: string;
  target_audience: string;
  requested_recipient_count: number;
  message_subject: string;
  message_body: string;
  status: OutreachStatus;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  event?: Event;
  requesting_org?: Organization;
  target_community?: Organization;
}

export interface OutreachCampaign {
  id: string;
  outreach_request_id: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  registrations_count: number;
  created_at: string;
}

export interface SponsorshipOpportunity {
  id: string;
  event_id: string;
  title: string;
  needs: Record<string, any>;
  budget_range?: string | null;
  created_at: string;
  event?: Event;
}

export interface SponsorshipApplication {
  id: string;
  opportunity_id: string;
  sponsor_org_id: string;
  status: SponsorshipStatus;
  notes?: string | null;
  created_at: string;
  opportunity?: SponsorshipOpportunity;
  sponsor_org?: Organization;
}

export interface Venue {
  id: string;
  owner_org_id: string;
  name: string;
  capacity: number;
  facilities: Record<string, any>;
  city: string;
  created_at: string;
  owner_org?: Organization;
}

export interface VenueRequest {
  id: string;
  venue_id: string;
  event_id: string;
  requesting_org_id: string;
  status: VenueRequestStatus;
  created_at: string;
  venue?: Venue;
  event?: Event;
  requesting_org?: Organization;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}
