import request from 'supertest';
import { app } from '../app';
import {
  EventCategory,
  EventFormat,
  OrganizationType,
  RoleType,
  RegistrationStatus,
  EventStatus,
} from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Phase 7 — Dashboards & Audit Trail', () => {
  let platformAdminToken: string;
  let organizerToken: string;
  let organizerUserId: string;
  let organizerOrgId: string;
  let eventId: string;

  let communityAdminToken: string;
  let communityAdminUserId: string;
  let communityOrgId: string;

  let attendeeToken: string;
  let attendeeUserId: string;

  let outsiderToken: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. Platform Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@eventops.io',
        password: 'Password123!',
        name: 'Platform SuperAdmin',
        roles: [RoleType.PLATFORM_ADMIN],
      });
    platformAdminToken = adminRes.body.data.tokens.accessToken;

    // 2. Organizer User & Org
    const orgUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'organizer@summit.org',
        password: 'Password123!',
        name: 'Olivia Organizer',
        roles: [RoleType.ORGANIZER],
      });
    organizerToken = orgUserRes.body.data.tokens.accessToken;
    organizerUserId = orgUserRes.body.data.user.id;

    const orgCreate = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'Tech Events Worldwide',
        type: OrganizationType.COMMUNITY,
        description: 'Organizing premier conferences',
      });
    organizerOrgId = orgCreate.body.data.id;

    // Create an Event under Organizer Org
    const evCreate = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizer_org_id: organizerOrgId,
        title: 'Global Dev Summit 2026',
        description: 'Annual gathering of software architects',
        category: EventCategory.TECH,
        format: EventFormat.OFFLINE,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        location: 'Grand Arena',
        capacity: 100,
      });
    eventId = evCreate.body.data.id;

    // 3. Community Admin & Community Org
    const commRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@reactcommunity.org',
        password: 'Password123!',
        name: 'Chloe Community',
        roles: [RoleType.ORGANIZER],
      });
    communityAdminToken = commRes.body.data.tokens.accessToken;
    communityAdminUserId = commRes.body.data.user.id;

    const commCreate = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${communityAdminToken}`)
      .send({
        name: 'React Berlin Chapter',
        type: OrganizationType.COMMUNITY,
        description: 'Local React developers meetups',
      });
    communityOrgId = commCreate.body.data.id;

    // 4. Attendee User
    const attRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'attendee@coders.net',
        password: 'Password123!',
        name: 'Aaron Attendee',
        roles: [RoleType.ATTENDEE],
      });
    attendeeToken = attRes.body.data.tokens.accessToken;
    attendeeUserId = attRes.body.data.user.id;

    // 5. Outsider (unrelated user)
    const outRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'outsider@other.org',
        password: 'Password123!',
        name: 'Oscar Outsider',
        roles: [RoleType.ATTENDEE],
      });
    outsiderToken = outRes.body.data.tokens.accessToken;
  });

  describe('Organizer Dashboard (/api/dashboards/organizer)', () => {
    it('calculates metrics accurately for events, registrations, and attendance conversion', async () => {
      // Publish event first
      await request(app)
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);

      // Register attendee for event
      const regRes = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);
      expect(regRes.status).toBe(201);
      const ticketCode = regRes.body.data.registration.ticket_code;

      // Check-in attendee and transition to ATTENDED
      const checkInRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticketCode,
          targetStatus: RegistrationStatus.ATTENDED,
        });
      expect(checkInRes.status).toBe(200);

      // Fetch organizer dashboard
      const dashRes = await request(app)
        .get(`/api/dashboards/organizer?org_id=${organizerOrgId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.success).toBe(true);

      const metrics = dashRes.body.data;
      expect(metrics.summary.total_events).toBe(1);
      expect(metrics.summary.published_events).toBe(1);
      expect(metrics.summary.total_registrations).toBe(1);
      expect(metrics.summary.total_attended).toBe(1);
      expect(metrics.summary.average_attendance_rate).toBe(100);

      expect(metrics.events_breakdown).toHaveLength(1);
      expect(metrics.events_breakdown[0].title).toBe('Global Dev Summit 2026');
      expect(metrics.events_breakdown[0].capacity).toBe(100);
      expect(metrics.events_breakdown[0].registered_count).toBe(1);
      expect(metrics.events_breakdown[0].attended_count).toBe(1);
      expect(metrics.events_breakdown[0].attendance_rate).toBe(100);
      expect(metrics.events_breakdown[0].remaining_capacity).toBe(99);

      expect(metrics.recent_activity.length).toBeGreaterThan(0);
    });

    it('denies access to an organizer dashboard for non-members (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/dashboards/organizer?org_id=${organizerOrgId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows a platform admin to inspect any organization dashboard', async () => {
      const res = await request(app)
        .get(`/api/dashboards/organizer?org_id=${organizerOrgId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.total_events).toBe(1);
    });

    it('returns empty fallback metrics when user has no organizations and no org_id is provided', async () => {
      const res = await request(app)
        .get('/api/dashboards/organizer')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.total_events).toBe(0);
      expect(res.body.data.events_breakdown).toHaveLength(0);
    });
  });

  describe('Community Dashboard (/api/dashboards/community)', () => {
    it('aggregates members, followers, outreach campaigns, open & click rates', async () => {
      // 1. Join community as member
      await request(app)
        .post(`/api/communities/${communityOrgId}/join`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      // 2. Follow community
      await request(app)
        .post(`/api/communities/${communityOrgId}/follow`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      // 3. Propose outreach from Organizer to Community
      const outreachRes = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          target_community_org_id: communityOrgId,
          requesting_org_id: organizerOrgId,
          event_id: eventId,
          purpose: 'Invitation to React developers for tech summit',
          target_audience: 'Senior React Engineers',
          requested_recipient_count: 50,
          message_subject: 'Special invitation to Global Dev Summit 2026',
          message_body: 'Join us at the Global Dev Summit with special discount code REACT2026',
        });
      expect(outreachRes.status).toBe(201);
      const outreachId = outreachRes.body.data.id;

      // 4. Community admin approves outreach
      const approveRes = await request(app)
        .patch(`/api/outreach/${outreachId}/review`)
        .set('Authorization', `Bearer ${communityAdminToken}`)
        .send({
          action: 'approve',
          custom_intro: 'Exclusive community pass from our partner',
        });
      expect(approveRes.status).toBe(200);

      // Fetch community dashboard
      const dashRes = await request(app)
        .get(`/api/dashboards/community?org_id=${communityOrgId}`)
        .set('Authorization', `Bearer ${communityAdminToken}`);

      expect(dashRes.status).toBe(200);
      const metrics = dashRes.body.data;
      expect(metrics.summary.member_count).toBeGreaterThanOrEqual(1);
      expect(metrics.summary.follower_count).toBe(1);
      expect(metrics.summary.total_outreach_campaigns).toBe(1);
      expect(metrics.summary.total_outreach_delivered).toBeGreaterThan(0);
      expect(metrics.campaigns_breakdown).toHaveLength(1);
      expect(metrics.campaigns_breakdown[0].purpose).toBe('Invitation to React developers for tech summit');
      expect(metrics.campaigns_breakdown[0].delivered_count).toBeGreaterThan(0);
    });

    it('denies community dashboard access to unauthorized users (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/dashboards/community?org_id=${communityOrgId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Audit Trail & Compliance Log (/api/dashboards/audit-logs)', () => {
    it('records immutable audit events on critical business actions', async () => {
      // Trigger a collaboration proposal
      const collabRes = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: organizerOrgId,
          target_org_id: communityOrgId,
          collab_type: 'CO_HOST',
          initial_message: 'Let us co-host the Berlin meetup',
        });
      expect(collabRes.status).toBe(201);

      // Fetch audit logs as Platform Admin
      const auditRes = await request(app)
        .get('/api/dashboards/audit-logs?page=1&limit=20')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(auditRes.body.data.items.length).toBeGreaterThan(0);
      expect(auditRes.body.data.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPrevPage: false,
      });

      const actions = auditRes.body.data.items.map((i: any) => i.action);
      expect(actions).toContain('COLLABORATION_PROPOSED');
    });

    it('allows filtering audit logs by action and target_type', async () => {
      const filterRes = await request(app)
        .get('/api/dashboards/audit-logs?action=COLLABORATION_PROPOSED&target_type=COLLABORATION')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(filterRes.status).toBe(200);
      for (const item of filterRes.body.data.items) {
        expect(item.action).toBe('COLLABORATION_PROPOSED');
        expect(item.target_type).toBe('COLLABORATION');
      }
    });

    it('scopes audit log queries for non-platform admins to their own organizations and user ID', async () => {
      const res = await request(app)
        .get('/api/dashboards/audit-logs')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      // All returned logs should be related to organizerOrgId or organizerUserId
      for (const item of items) {
        const isOrgTarget = item.target_id === organizerOrgId;
        const isUserTarget = item.target_id === organizerUserId;
        const isActor = item.actor_user_id === organizerUserId;
        expect(isOrgTarget || isUserTarget || isActor).toBe(true);
      }
    });
  });
});
