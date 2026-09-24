import request from 'supertest';
import { app } from '../app';
import {
  EventCategory,
  EventFormat,
  OrganizationType,
  OutreachStatus,
  RoleType,
} from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Permission-Based Outreach & Privacy Boundaries (Phase 5)', () => {
  let organizerToken: string;
  let organizerOrgId: string;
  let eventId: string;

  let communityAdminToken: string;
  let communityAdminId: string;
  let communityOrgId: string;

  let member1Email: string;
  let member2Email: string;

  let outsiderToken: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. Organizer (Organizer A) & Org
    const regOrg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'organizer.a@techsummit.io',
        password: 'Password123!',
        name: 'Organizer Alice',
        roles: [RoleType.ORGANIZER],
      });
    organizerToken = regOrg.body.data.tokens.accessToken;

    const orgRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'Cloud Native Organizers Inc',
        type: OrganizationType.COMPANY,
        description: 'Organizers of CloudCon',
      });
    organizerOrgId = orgRes.body.data.id;

    // Create Event under Organizer Org
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizer_org_id: organizerOrgId,
        title: 'CloudCon 2026',
        description: 'Premier cloud architecture conference',
        category: EventCategory.TECH,
        format: EventFormat.OFFLINE,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        location: 'Metro Convention Center',
        capacity: 500,
      });
    eventId = eventRes.body.data.id;

    // 2. Community B (Target Community) & Admin
    const regComm = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin.b@reactberlin.de',
        password: 'Password123!',
        name: 'Bob Community Admin',
        roles: [RoleType.COMMUNITY_ADMIN],
      });
    communityAdminToken = regComm.body.data.tokens.accessToken;
    communityAdminId = regComm.body.data.user.id;

    const commOrgRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${communityAdminToken}`)
      .send({
        name: 'React Berlin Community',
        type: OrganizationType.COMMUNITY,
        description: 'Local community of 2,000+ React engineers',
      });
    communityOrgId = commOrgRes.body.data.id;

    // 3. Register Private Members & Followers of Community B
    member1Email = 'private.developer1@secretcompany.com';
    const regM1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: member1Email,
        password: 'Password123!',
        name: 'Dave Developer',
        roles: [RoleType.ATTENDEE],
      });
    const m1Token = regM1.body.data.tokens.accessToken;

    // Dave follows Community B
    await request(app)
      .post(`/api/communities/${communityOrgId}/follow`)
      .set('Authorization', `Bearer ${m1Token}`);

    member2Email = 'private.engineer2@stealthtech.io';
    const regM2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: member2Email,
        password: 'Password123!',
        name: 'Eve Engineer',
        roles: [RoleType.ATTENDEE],
      });
    const m2Token = regM2.body.data.tokens.accessToken;

    // Eve joins Community B as an internal member
    await request(app)
      .post(`/api/organizations/${communityOrgId}/join`)
      .set('Authorization', `Bearer ${m2Token}`);

    // 4. Outsider User
    const regOut = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'outsider@other.org',
        password: 'Password123!',
        name: 'Oscar Outsider',
        roles: [RoleType.ATTENDEE],
      });
    outsiderToken = regOut.body.data.tokens.accessToken;
  });

  describe('Outreach Submission & Review Pipeline', () => {
    it('submits outreach request successfully into review queue', async () => {
      const res = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: communityOrgId,
          event_id: eventId,
          purpose: 'Call for speakers on Kubernetes and React micro-frontends',
          target_audience: 'Senior frontend and fullstack developers',
          requested_recipient_count: 50,
          message_subject: 'Speak at CloudCon 2026 — CFP Open for React Berlin Members',
          message_body: 'Hi React Berliners, we are excited to invite you to submit talk proposals for CloudCon 2026...',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe(OutreachStatus.PENDING);
      expect(res.body.data.purpose).toContain('Call for speakers');

      // Verify audit log
      expect(memoryDb.auditLogs.some((l) => l.action === 'OUTREACH_REQUEST_SUBMITTED')).toBe(true);
    });

    it('rejects submitting outreach request to own organization', async () => {
      const res = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: organizerOrgId,
          event_id: eventId,
          purpose: 'Invalid self-request',
          target_audience: 'Everyone',
          requested_recipient_count: 10,
          message_subject: 'Test',
          message_body: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Cannot submit outreach request to your own organization/i);
    });

    it('rejects submission if caller is not a member of the requesting organization', async () => {
      const res = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: communityOrgId,
          event_id: eventId,
          purpose: 'Unauthorized attempt',
          target_audience: 'Everyone',
          requested_recipient_count: 10,
          message_subject: 'Test',
          message_body: 'Test',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/must be a member of the requesting organization/i);
    });
  });

  describe('Rate Limiting on Outreach Requests', () => {
    it('enforces daily rate limit on unverified organizations (max 3/day)', async () => {
      // Submit 3 requests (the max limit for unverified)
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post('/api/outreach')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            requesting_org_id: organizerOrgId,
            target_community_org_id: communityOrgId,
            event_id: eventId,
            purpose: `Request ${i}`,
            target_audience: 'Developers',
            requested_recipient_count: 25,
            message_subject: `Subject ${i}`,
            message_body: `Body ${i}`,
          });
        expect(res.status).toBe(201);
      }

      // 4th request must be rejected with 429
      const overLimitRes = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: communityOrgId,
          event_id: eventId,
          purpose: 'Request 4 (Over limit)',
          target_audience: 'Developers',
          requested_recipient_count: 25,
          message_subject: 'Subject 4',
          message_body: 'Body 4',
        });

      expect(overLimitRes.status).toBe(429);
      expect(overLimitRes.body.error.message).toMatch(/Rate limit exceeded/i);
      expect(overLimitRes.body.error.message).toMatch(/limited to 3 outreach requests per day/i);
    });
  });

  describe('Community Admin Review Queue & Approval with Edits', () => {
    let requestId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: communityOrgId,
          event_id: eventId,
          purpose: 'Promote early bird tickets to React developers',
          target_audience: 'React community',
          requested_recipient_count: 100,
          message_subject: 'Get 20% off CloudCon tickets',
          message_body: 'Check out CloudCon 2026 early bird discounts!',
        });
      requestId = res.body.data.id;
    });

    it('allows target community admin to view review queue', async () => {
      const queueRes = await request(app)
        .get(`/api/outreach?target_community_org_id=${communityOrgId}`)
        .set('Authorization', `Bearer ${communityAdminToken}`);

      expect(queueRes.status).toBe(200);
      expect(queueRes.body.data.items).toHaveLength(1);
      expect(queueRes.body.data.items[0].id).toBe(requestId);
    });

    it('rejects outsider from reviewing or approving outreach requests', async () => {
      const res = await request(app)
        .patch(`/api/outreach/${requestId}/review`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ action: 'approve' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Only administrators of the target community/i);
    });

    it('allows community admin to approve with edits (adjusting subject/body)', async () => {
      const reviewRes = await request(app)
        .patch(`/api/outreach/${requestId}/review`)
        .set('Authorization', `Bearer ${communityAdminToken}`)
        .send({
          action: 'approve_with_edits',
          message_subject: '[React Berlin Exclusive] 25% Off CloudCon 2026 Tickets',
          message_body: 'Community update: CloudCon has partnered with React Berlin to offer our members 25% off!',
          notes: 'Added exclusive partner discount phrasing',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.status).toBe(OutreachStatus.APPROVED);
      expect(reviewRes.body.data.message_subject).toContain('[React Berlin Exclusive]');

      // Verify campaign was automatically initiated
      expect(reviewRes.body.data.campaign).toBeDefined();
      expect(reviewRes.body.data.campaign.sent_count).toBeGreaterThanOrEqual(2);

      // Verify audit log
      expect(memoryDb.auditLogs.some((l) => l.action === 'OUTREACH_REQUEST_APPROVE_WITH_EDITS')).toBe(true);
    });

    it('allows community admin to request more info (needs_info status)', async () => {
      const res = await request(app)
        .patch(`/api/outreach/${requestId}/review`)
        .set('Authorization', `Bearer ${communityAdminToken}`)
        .send({
          action: 'needs_info',
          notes: 'Please provide more details on student ticket accessibility.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(OutreachStatus.NEEDS_INFO);
    });

    it('allows community admin to reject outreach request', async () => {
      const res = await request(app)
        .patch(`/api/outreach/${requestId}/review`)
        .set('Authorization', `Bearer ${communityAdminToken}`)
        .send({
          action: 'reject',
          notes: 'Not a good fit for our community audience.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(OutreachStatus.REJECTED);
    });
  });

  describe('CORE INNOVATION: Permission-Based Outreach Privacy Guarantee', () => {
    let requestId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/outreach')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          requesting_org_id: organizerOrgId,
          target_community_org_id: communityOrgId,
          event_id: eventId,
          purpose: 'Announce conference workshop track',
          target_audience: 'React Berlin members',
          requested_recipient_count: 50,
          message_subject: 'CloudCon Workshop Track Announced',
          message_body: 'Hands-on React & Cloud workshops...',
        });
      requestId = res.body.data.id;

      // Community admin approves
      await request(app)
        .patch(`/api/outreach/${requestId}/review`)
        .set('Authorization', `Bearer ${communityAdminToken}`)
        .send({ action: 'approve' });
    });

    it('STRICT PRIVACY INVARIANT: Organizer A never receives member emails, user IDs, or follower lists', async () => {
      // 1. Check Outreach Request Endpoint
      const reqRes = await request(app)
        .get(`/api/outreach/${requestId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(reqRes.status).toBe(200);
      const reqPayloadStr = JSON.stringify(reqRes.body);

      // Explicitly assert that private member emails are NOT anywhere in the JSON response
      expect(reqPayloadStr).not.toContain(member1Email);
      expect(reqPayloadStr).not.toContain(member2Email);
      expect(reqRes.body.data.recipients).toBeUndefined();
      expect(reqRes.body.data.members).toBeUndefined();
      expect(reqRes.body.data.followers).toBeUndefined();

      // 2. Check Campaign Metrics Endpoint
      const campRes = await request(app)
        .get(`/api/outreach/${requestId}/campaign`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(campRes.status).toBe(200);
      const campPayloadStr = JSON.stringify(campRes.body);

      // Explicitly assert that no recipient emails exist in campaign payload
      expect(campPayloadStr).not.toContain(member1Email);
      expect(campPayloadStr).not.toContain(member2Email);

      // Only aggregated metrics exist
      expect(campRes.body.data.sent_count).toBeGreaterThanOrEqual(2);
      expect(campRes.body.data.delivered_count).toBeGreaterThanOrEqual(2);
      expect(typeof campRes.body.data.opened_count).toBe('number');
      expect(typeof campRes.body.data.clicked_count).toBe('number');
      expect(typeof campRes.body.data.registrations_count).toBe('number');

      // 3. Check List Endpoint
      const listRes = await request(app)
        .get(`/api/outreach?requesting_org_id=${organizerOrgId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(listRes.status).toBe(200);
      const listPayloadStr = JSON.stringify(listRes.body);
      expect(listPayloadStr).not.toContain(member1Email);
      expect(listPayloadStr).not.toContain(member2Email);
    });

    it('tracks aggregated engagement metrics and calculates open/click rates', async () => {
      // Simulate engagement: 2 opens, 1 click, 1 registration
      const simRes = await request(app)
        .post(`/api/outreach/${requestId}/simulate-activity`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          opens: 2,
          clicks: 1,
          registrations: 1,
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.data.opened_count).toBe(2);
      expect(simRes.body.data.clicked_count).toBe(1);
      expect(simRes.body.data.registrations_count).toBe(1);

      // Fetch campaign stats
      const campRes = await request(app)
        .get(`/api/outreach/${requestId}/campaign`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(campRes.status).toBe(200);
      expect(campRes.body.data.opened_count).toBe(2);
      expect(campRes.body.data.clicked_count).toBe(1);
      expect(campRes.body.data.open_rate).toBeGreaterThan(0);
      expect(campRes.body.data.click_rate).toBeGreaterThan(0);
    });
  });
});
