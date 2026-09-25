import { memoryDb } from './memoryDb';
import { hashPassword } from './auth.utils';
import {
  RoleType,
  OrganizationType,
  OrgMemberRole,
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
  CollaborationType,
  CollaborationStatus,
  OutreachStatus,
  SponsorshipStatus,
  VenueRequestStatus,
} from '@eventops/shared-types';

export async function seedMemoryDatabase() {
  // Clear any leftover state
  memoryDb.clear();

  const passwordHash = await hashPassword('Password123!');

  // 1. Seed Users & Roles
  const olivia = memoryDb.createUser({
    name: 'Olivia Organizer',
    email: 'organizer@summit.org',
    password_hash: passwordHash,
    interests: ['tech', 'events', 'cloud-architecture', 'leadership'],
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });
  memoryDb.createRole({ user_id: olivia.id, role_type: RoleType.ORGANIZER });

  const chloe = memoryDb.createUser({
    name: 'Chloe Admin',
    email: 'admin@reactcommunity.org',
    password_hash: passwordHash,
    interests: ['react', 'typescript', 'frontend', 'community'],
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  });
  memoryDb.createRole({ user_id: chloe.id, role_type: RoleType.COMMUNITY_ADMIN });

  const sam = memoryDb.createUser({
    name: 'Sam Sponsor',
    email: 'sponsor@cloudcorp.io',
    password_hash: passwordHash,
    interests: ['cloud', 'sponsorships', 'partnerships', 'ai'],
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  });
  memoryDb.createRole({ user_id: sam.id, role_type: RoleType.SPONSOR });

  const aaron = memoryDb.createUser({
    name: 'Aaron Attendee',
    email: 'attendee@coders.net',
    password_hash: passwordHash,
    interests: ['fullstack', 'open-source', 'networking'],
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  });
  memoryDb.createRole({ user_id: aaron.id, role_type: RoleType.ATTENDEE });

  const superAdmin = memoryDb.createUser({
    name: 'Platform SuperAdmin',
    email: 'admin@eventops.io',
    password_hash: passwordHash,
    interests: ['governance', 'security', 'infrastructure'],
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  });
  memoryDb.createRole({ user_id: superAdmin.id, role_type: RoleType.PLATFORM_ADMIN });

  // Additional Attendees
  const sarah = memoryDb.createUser({
    name: 'Sarah Connor',
    email: 'sarah@cyberdyne.com',
    password_hash: passwordHash,
    interests: ['security', 'ai', 'devops'],
  });
  memoryDb.createRole({ user_id: sarah.id, role_type: RoleType.ATTENDEE });

  const marcus = memoryDb.createUser({
    name: 'Marcus Vance',
    email: 'marcus@devhub.org',
    password_hash: passwordHash,
    interests: ['rust', 'go', 'distributed-systems'],
  });
  memoryDb.createRole({ user_id: marcus.id, role_type: RoleType.ATTENDEE });

  // 2. Seed Organizations
  const summitOrg = memoryDb.createOrganization({
    name: 'Global Tech Summit Org',
    type: OrganizationType.COMPANY,
    description: 'Organizer of premier global technology and cloud architecture summits.',
    website: 'https://techsummit.global',
    verified: true,
  });
  memoryDb.addMember({ org_id: summitOrg.id, user_id: olivia.id, role_in_org: OrgMemberRole.OWNER });

  const reactOrg = memoryDb.createOrganization({
    name: 'React & TypeScript Berlin Chapter',
    type: OrganizationType.COMMUNITY,
    description: 'Largest active frontend development community in Berlin with over 4,500 engineers.',
    website: 'https://reactberlin.dev',
    verified: true,
  });
  memoryDb.addMember({ org_id: reactOrg.id, user_id: chloe.id, role_in_org: OrgMemberRole.OWNER });

  const cloudCorp = memoryDb.createOrganization({
    name: 'CloudCorp Global',
    type: OrganizationType.COMPANY,
    description: 'Enterprise cloud platform & AI compute infrastructure provider.',
    website: 'https://cloudcorp.io',
    verified: true,
  });
  memoryDb.addMember({ org_id: cloudCorp.id, user_id: sam.id, role_in_org: OrgMemberRole.OWNER });

  const osFoundation = memoryDb.createOrganization({
    name: 'Open Source Ecosystem Foundation',
    type: OrganizationType.NGO,
    description: 'Empowering open-source maintainers and developer education worldwide.',
    website: 'https://opensourcefoundation.org',
    verified: true,
  });

  const aiGroup = memoryDb.createOrganization({
    name: 'AI & Machine Learning Developers',
    type: OrganizationType.COMMUNITY,
    description: 'Community exploring generative AI models, LLM tooling, and vector databases.',
    website: 'https://aidevs.community',
    verified: true,
  });

  // Followers
  memoryDb.addFollower(reactOrg.id, aaron.id);
  memoryDb.addFollower(reactOrg.id, sarah.id);
  memoryDb.addFollower(reactOrg.id, marcus.id);
  memoryDb.addFollower(aiGroup.id, aaron.id);

  // 3. Seed Events
  const event1 = memoryDb.createEvent({
    organizer_org_id: summitOrg.id,
    title: 'Global AI & Cloud Architecture Summit 2026',
    description: 'Two-day flagship conference covering microservices, multi-region database scaling, and LLM production deployments.',
    category: EventCategory.TECH,
    format: EventFormat.OFFLINE,
    start_date: new Date(Date.now() + 86400000 * 5),
    end_date: new Date(Date.now() + 86400000 * 7),
    location: 'Berlin Tech Hub Main Stage, Germany',
    capacity: 500,
    status: EventStatus.PUBLISHED,
  });

  const event2 = memoryDb.createEvent({
    organizer_org_id: reactOrg.id,
    title: 'React 19 & Vite 5 Performance Masterclass',
    description: 'Deep dive workshop into Server Actions, React Compiler optimizations, and ultra-fast Vite module bundling.',
    category: EventCategory.TECH,
    format: EventFormat.OFFLINE,
    start_date: new Date(Date.now() + 86400000 * 12),
    end_date: new Date(Date.now() + 86400000 * 12 + 14400000),
    location: 'Frankfurt Digital Loft & Live Stream',
    capacity: 250,
    status: EventStatus.PUBLISHED,
  });

  const event3 = memoryDb.createEvent({
    organizer_org_id: osFoundation.id,
    title: 'Global Open Source Hackathon 2026',
    description: '48-hour global virtual hackathon building public goods, developer tooling, and accessibility SDKs.',
    category: EventCategory.TECH,
    format: EventFormat.ONLINE,
    start_date: new Date(Date.now() + 86400000 * 20),
    end_date: new Date(Date.now() + 86400000 * 22),
    location: 'Discord Virtual Main Stage & GitHub Classrooms',
    capacity: 1000,
    status: EventStatus.PUBLISHED,
  });

  const event4 = memoryDb.createEvent({
    organizer_org_id: summitOrg.id,
    title: 'Cybersecurity & Zero Trust Architecture Keynote',
    description: 'Enterprise security panel on cryptographic identity verification, HMAC ticket security, and RBAC policies.',
    category: EventCategory.TECH,
    format: EventFormat.OFFLINE,
    start_date: new Date(Date.now() + 86400000 * 30),
    end_date: new Date(Date.now() + 86400000 * 30 + 18000000),
    location: 'Munich Innovation Center, Auditorium A',
    capacity: 300,
    status: EventStatus.PUBLISHED,
  });

  // 4. Seed Event Registrations & VIP Tickets
  const reg1 = memoryDb.createRegistration({
    event_id: event1.id,
    user_id: aaron.id,
    ticket_code: 'TCK-AI-SUMMIT-001',
    status: RegistrationStatus.REGISTERED,
  });

  const reg2 = memoryDb.createRegistration({
    event_id: event1.id,
    user_id: sarah.id,
    ticket_code: 'TCK-AI-SUMMIT-002',
    status: RegistrationStatus.CHECKED_IN,
  });

  const reg3 = memoryDb.createRegistration({
    event_id: event2.id,
    user_id: aaron.id,
    ticket_code: 'TCK-REACT-MASTER-003',
    status: RegistrationStatus.CHECKED_IN,
  });

  // 5. Seed Certificates
  const cert1 = memoryDb.createCertificate({
    registration_id: reg2.id,
    verification_id: 'CERT-AI-2026-88912',
  });

  const cert2 = memoryDb.createCertificate({
    registration_id: reg3.id,
    verification_id: 'CERT-REACT-2026-44102',
  });

  // 6. Seed Collaborations & Workspace Tasks
  const collab1 = memoryDb.createCollaboration({
    event_id: event1.id,
    requesting_org_id: summitOrg.id,
    target_org_id: reactOrg.id,
    collab_type: CollaborationType.TECHNICAL,
    status: CollaborationStatus.ACCEPTED,
  });

  memoryDb.createCollaborationMessage({
    collaboration_id: collab1.id,
    sender_org_id: summitOrg.id,
    body: 'We would love to co-host the AI & Cloud Summit with Berlin React Chapter and sponsor 50 VIP student passes!',
  });

  memoryDb.createCollaborationMessage({
    collaboration_id: collab1.id,
    sender_org_id: reactOrg.id,
    body: 'Proposal accepted! We will manage the Frontend track and facilitate the speaker Q&A panel.',
  });

  memoryDb.createCollaborationTask({
    collaboration_id: collab1.id,
    title: 'Finalize Keynote Speaker Schedule',
    description: 'Confirm 4 keynote speakers and assign stage time slots.',
    assigned_org_id: summitOrg.id,
    completed: true,
  });

  memoryDb.createCollaborationTask({
    collaboration_id: collab1.id,
    title: 'Publish Co-Branded Marketing Banner',
    description: 'Distribute social banners across Twitter, LinkedIn, and Meetup chapter channels.',
    assigned_org_id: reactOrg.id,
    completed: false,
  });

  // 7. Seed Outreach Requests & Campaigns
  const outreach1 = memoryDb.createOutreachRequest({
    requesting_org_id: summitOrg.id,
    target_community_org_id: reactOrg.id,
    event_id: event1.id,
    purpose: 'Promote VIP Cloud Summit Passes to React Chapter Community',
    target_audience: 'Frontend & Fullstack Developers in Berlin',
    requested_recipient_count: 450,
    message_subject: '🔥 Exclusive VIP Invitation: Global Tech Summit 2026',
    message_body: 'Join top cloud architects and core team maintainers in Berlin. Get 20% off with promo REACT2026.',
    status: OutreachStatus.APPROVED,
  });

  memoryDb.createOutreachCampaign({
    outreach_request_id: outreach1.id,
    sent_count: 450,
    delivered_count: 442,
    opened_count: 310,
    clicked_count: 185,
    registrations_count: 94,
  });

  // 8. Seed Sponsorship Opportunities & Applications
  const opp1 = memoryDb.createSponsorshipOpportunity({
    event_id: event1.id,
    title: 'Gold Tier Sponsorship Package',
    budget_range: '$5,000 - $10,000',
    needs: { booth: true, keynote_slot: true, logo_placement: 'hero', VIP_passes: 10 },
  });

  memoryDb.createSponsorshipApplication({
    opportunity_id: opp1.id,
    sponsor_org_id: cloudCorp.id,
    status: SponsorshipStatus.CONFIRMED,
    notes: 'Confirmed $10,000 CloudCorp Sponsorship with dedicated AI Workshop booth.',
  });

  // 9. Seed Venues & Venue Requests
  const venue1 = memoryDb.createVenue({
    owner_org_id: summitOrg.id,
    name: 'Berlin Tech Hub Auditorium',
    city: 'Berlin',
    capacity: 600,
    facilities: { wifi: true, projector4k: true, soundSystem: true, stageLighting: true, cateringKitchen: true },
  });

  const venue2 = memoryDb.createVenue({
    owner_org_id: reactOrg.id,
    name: 'Frankfurt Digital Loft',
    city: 'Frankfurt',
    capacity: 250,
    facilities: { wifi: true, liveStreamingRig: true, podcastStudio: true, breakoutRooms: 4 },
  });

  memoryDb.createVenueRequest({
    venue_id: venue1.id,
    event_id: event1.id,
    requesting_org_id: summitOrg.id,
    status: VenueRequestStatus.ACCEPTED,
    notes: 'Main Stage booked for 2 full days with tech crew support.',
  });

  // 10. Audit Logs
  memoryDb.createAuditLog({
    actor_user_id: olivia.id,
    action: 'CREATE_EVENT',
    target_type: 'EVENT',
    target_id: event1.id,
    metadata: { title: event1.title },
  });

  memoryDb.createAuditLog({
    actor_user_id: chloe.id,
    action: 'APPROVE_OUTREACH',
    target_type: 'OUTREACH',
    target_id: outreach1.id,
  });
}
