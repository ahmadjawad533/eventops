import request from 'supertest';
import { app } from '../app';
import {
  CollaborationStatus,
  CollaborationType,
  EventCategory,
  EventFormat,
  EventStatus,
  OrganizationType,
  RoleType,
} from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Collaboration Marketplace & Shared Workspace (Phase 4)', () => {
  let orgAOwnerToken: string;
  let orgAId: string;
  let eventId: string;

  let orgBOwnerToken: string;
  let orgBId: string;

  let outsiderToken: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. User & Org A (Tech Meetup Community)
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'alice@orga.com',
        password: 'Password123!',
        name: 'Alice Admin',
        roles: [RoleType.ORGANIZER, RoleType.COMMUNITY_ADMIN],
      });
    orgAOwnerToken = regA.body.data.tokens.accessToken;

    const orgARes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${orgAOwnerToken}`)
      .send({
        name: 'TypeScript Developers Community',
        type: OrganizationType.COMMUNITY,
        description: 'Community for TS devs',
      });
    orgAId = orgARes.body.data.id;

    // Create Event under Org A
    const eventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${orgAOwnerToken}`)
      .send({
        organizer_org_id: orgAId,
        title: 'Global TypeScript Summit 2026',
        description: 'Annual deep dive into TypeScript',
        category: EventCategory.TECH,
        format: EventFormat.OFFLINE,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        location: 'Silicon Hall, SF',
        capacity: 250,
      });
    eventId = eventRes.body.data.id;

    // 2. User & Org B (Design Guild Community)
    const regB = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@orgb.com',
        password: 'Password123!',
        name: 'Bob Builder',
        roles: [RoleType.COMMUNITY_ADMIN],
      });
    orgBOwnerToken = regB.body.data.tokens.accessToken;

    const orgBRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${orgBOwnerToken}`)
      .send({
        name: 'Frontend & UI Designers Guild',
        type: OrganizationType.COMMUNITY,
        description: 'Design and UI guild',
      });
    orgBId = orgBRes.body.data.id;

    // 3. Outsider User (Unrelated Attendee)
    const regOut = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'outsider@other.com',
        password: 'Password123!',
        name: 'Oscar Outsider',
        roles: [RoleType.ATTENDEE],
      });
    outsiderToken = regOut.body.data.tokens.accessToken;
  });

  describe('Proposal Creation (POST /api/collaboration)', () => {
    it('successfully proposes collaboration with initial message', async () => {
      const res = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.SPEAKER,
          initial_message: 'Hi Bob, we would love your designers to present a talk at TS Summit!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe(CollaborationStatus.PROPOSED);
      expect(res.body.data.collab_type).toBe(CollaborationType.SPEAKER);
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0].body).toContain('Hi Bob');
      expect(res.body.data.messages[0].is_counterproposal).toBe(false);

      // Verify audit log entry
      expect(memoryDb.auditLogs.some((l) => l.action === 'COLLABORATION_PROPOSED')).toBe(true);
    });

    it('rejects proposing collaboration with the same organization', async () => {
      const res = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgAId,
          collab_type: CollaborationType.OUTREACH,
          initial_message: 'Invalid self-proposal',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Cannot propose collaboration with your own organization/i);
    });

    it('rejects proposal when caller does not belong to requesting organization', async () => {
      const res = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.SPONSORSHIP,
          initial_message: 'Unauthorized proposal',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/must be a member of the requesting organization/i);
    });
  });

  describe('Negotiation & Counter-Proposal Flow', () => {
    let collabId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.VENUE,
          initial_message: 'Can we co-host and share the auditorium venue?',
        });
      collabId = res.body.data.id;
    });

    it('allows target organization to counter-propose with notes', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({
          action: 'counter',
          message: 'We can share the auditorium if we also have 2 keynote slots for UI design.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(CollaborationStatus.COUNTERED);

      // Check messages
      const getRes = await request(app)
        .get(`/api/collaboration/${collabId}`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.messages).toHaveLength(2);
      const counterMsg = getRes.body.data.messages[1];
      expect(counterMsg.body).toContain('2 keynote slots');
      expect(counterMsg.is_counterproposal).toBe(true);

      expect(memoryDb.auditLogs.some((l) => l.action === 'COLLABORATION_COUNTERED')).toBe(true);
    });

    it('requires message explanation when countering', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({
          action: 'counter',
          message: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/message or explanation is required/i);
    });

    it('allows sending messages back and forth in thread', async () => {
      const sendRes = await request(app)
        .post(`/api/collaboration/${collabId}/messages`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          sender_org_id: orgAId,
          body: 'We can offer 1 keynote and 1 workshop slot instead.',
        });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.data.body).toContain('1 keynote');
    });

    it('allows target organization to reject proposal', async () => {
      const res = await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({
          action: 'reject',
          message: 'Sorry, our auditorium is fully booked during those dates.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(CollaborationStatus.REJECTED);
      expect(memoryDb.auditLogs.some((l) => l.action === 'COLLABORATION_REJECTED')).toBe(true);

      // Cannot re-accept once rejected
      const reAccept = await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({ action: 'accept' });

      expect(reAccept.status).toBe(400);
      expect(reAccept.body.error.message).toMatch(/already been rejected/i);
    });
  });

  describe('Acceptance & Shared Workspace (Tasks + Messages)', () => {
    let collabId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.TECHNICAL,
          initial_message: 'Let us collaborate on the hackathon track!',
        });
      collabId = res.body.data.id;
    });

    it('blocks access to shared workspace if proposal is not yet accepted', async () => {
      const res = await request(app)
        .get(`/api/collaboration/${collabId}/workspace`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/only available for accepted collaborations/i);
    });

    it('accepts proposal, seeds initial workspace tasks, and allows workspace access', async () => {
      const acceptRes = await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({
          action: 'accept',
          message: 'Excited to collaborate! Accepted.',
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe(CollaborationStatus.ACCEPTED);
      expect(memoryDb.auditLogs.some((l) => l.action === 'COLLABORATION_ACCEPTED')).toBe(true);

      // Fetch shared workspace
      const wsRes = await request(app)
        .get(`/api/collaboration/${collabId}/workspace`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`);

      expect(wsRes.status).toBe(200);
      expect(wsRes.body.data.collaboration.id).toBe(collabId);
      expect(wsRes.body.data.tasks.length).toBeGreaterThanOrEqual(3);
      expect(wsRes.body.data.messages.length).toBe(2);
    });

    it('allows partners to create, update, complete, and delete workspace tasks', async () => {
      // 1. Accept first
      await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({ action: 'accept' });

      // 2. Add new custom task
      const taskRes = await request(app)
        .post(`/api/collaboration/${collabId}/workspace/tasks`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          title: 'Order Hackathon Swag and Badges',
          description: 'Custom stickers and t-shirts for participants',
          assigned_org_id: orgAId,
        });

      expect(taskRes.status).toBe(201);
      const taskId = taskRes.body.data.id;
      expect(taskRes.body.data.completed).toBe(false);

      // 3. Mark task completed
      const updateRes = await request(app)
        .patch(`/api/collaboration/${collabId}/workspace/tasks/${taskId}`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({
          completed: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.completed).toBe(true);

      // 4. Delete task
      const delRes = await request(app)
        .delete(`/api/collaboration/${collabId}/workspace/tasks/${taskId}`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`);

      expect(delRes.status).toBe(200);

      // Verify deletion in workspace
      const wsRes = await request(app)
        .get(`/api/collaboration/${collabId}/workspace`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`);

      expect(wsRes.body.data.tasks.some((t: any) => t.id === taskId)).toBe(false);
    });

    it('rejects outsider from viewing or modifying workspace tasks', async () => {
      await request(app)
        .post(`/api/collaboration/${collabId}/respond`)
        .set('Authorization', `Bearer ${orgBOwnerToken}`)
        .send({ action: 'accept' });

      const wsRes = await request(app)
        .get(`/api/collaboration/${collabId}/workspace`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(wsRes.status).toBe(403);
      expect(wsRes.body.error.message).toMatch(/Forbidden/i);
    });
  });

  describe('Collaboration Discovery & List (GET /api/collaboration)', () => {
    it('returns paginated list filtered by organization', async () => {
      // Create 2 collaborations
      await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.SPEAKER,
          initial_message: 'Collab 1',
        });

      await request(app)
        .post('/api/collaboration')
        .set('Authorization', `Bearer ${orgAOwnerToken}`)
        .send({
          event_id: eventId,
          requesting_org_id: orgAId,
          target_org_id: orgBId,
          collab_type: CollaborationType.MEDIA,
          initial_message: 'Collab 2',
        });

      const listRes = await request(app)
        .get(`/api/collaboration?org_id=${orgAId}&page=1&limit=10`)
        .set('Authorization', `Bearer ${orgAOwnerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items).toHaveLength(2);
      expect(listRes.body.data.meta.total).toBe(2);
    });
  });
});
