export enum RoleType {
  ATTENDEE = 'attendee',
  ORGANIZER = 'organizer',
  COMMUNITY_ADMIN = 'community_admin',
  SPONSOR = 'sponsor',
  VENUE_OWNER = 'venue_owner',
  PLATFORM_ADMIN = 'platform_admin',
}

export enum OrganizationType {
  COMMUNITY = 'community',
  COMPANY = 'company',
  UNIVERSITY = 'university',
  NGO = 'ngo',
}

export enum OrgMemberRole {
  MEMBER = 'member',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export enum EventFormat {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventCategory {
  TECH = 'tech',
  DESIGN = 'design',
  BUSINESS = 'business',
  SCIENCE = 'science',
  SOCIAL = 'social',
  OTHER = 'other',
}

export enum RegistrationStatus {
  REGISTERED = 'registered',
  CHECKED_IN = 'checked_in',
  ATTENDED = 'attended',
}

export enum CollaborationType {
  OUTREACH = 'outreach',
  SPONSORSHIP = 'sponsorship',
  VENUE = 'venue',
  SPEAKER = 'speaker',
  MEDIA = 'media',
  TECHNICAL = 'technical',
  GENERAL = 'general',
}

export enum CollaborationStatus {
  PROPOSED = 'proposed',
  COUNTERED = 'countered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum OutreachStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_INFO = 'needs_info',
}

export enum SponsorshipStatus {
  POTENTIAL = 'potential',
  CONTACTED = 'contacted',
  INTERESTED = 'interested',
  NEGOTIATION = 'negotiation',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
}

export enum VenueRequestStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COUNTERED = 'countered',
}
