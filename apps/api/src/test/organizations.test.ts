import request from 'supertest';
import { app } from '../app';
import { OrganizationType, OrgMemberRole, RoleType } from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Organizations & Communities Module (Phase 2)', () => {
  let userToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;
  let adminToken: string;
  let adminId: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. Regular user
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user1@example.com',
        password: 'Password123!',
        name: 'User One',
      });
    userToken = res1.body.data.tokens.accessToken;
    userId = res1.body.data.user.id;

    // 2. Second user
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user2@example.com',
        password: 'Password123!',
        name: 'User Two',
      });
    secondToken = res2.body.data.tokens.accessToken;
    secondUserId = res2.body.data.user.id;

    // 3. Platform Admin
    const resAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@eventops.local',
        password: 'Password123!',
        name: 'Platform Admin',
        roles: [RoleType.PLATFORM_ADMIN],
      });
    adminToken = resAdmin.body.data.tokens.accessToken;
    adminId = resAdmin.body.data.user.id;
  });

  let secondToken: string;

  describe('POST /api/organizations (Create Organization/Community)', () => {
    it('should create a community, make creator the owner, and assign community_admin role', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Cloud Native Berlin',
          type: OrganizationType.COMMUNITY,
          description: 'A community for cloud native enthusiasts',
          website: 'https://cloudnative.berlin',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Cloud Native Berlin');
      expect(res.body.data.type).toBe(OrganizationType.COMMUNITY);
      expect(res.body.data.verified).toBe(false);

      const orgId = res.body.data.id;

      // Verify creator is OWNER
      const membersRes = await request(app).get(`/api/organizations/${orgId}/members`);
      expect(membersRes.status).toBe(200);
      expect(membersRes.body.data.items).toHaveLength(1);
      expect(membersRes.body.data.items[0].user_id).toBe(userId);
      expect(membersRes.body.data.items[0].role_in_org).toBe(OrgMemberRole.OWNER);

      // Verify creator holds community_admin role
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      const roles = meRes.body.data.roles.map((r: any) => r.role_type);
      expect(roles).toContain(RoleType.COMMUNITY_ADMIN);
    });

    it('should create a company organization and assign organizer role', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Acme Corp',
          type: OrganizationType.COMPANY,
          description: 'Software solutions company',
          website: 'https://acme.example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Acme Corp');
      expect(res.body.data.type).toBe(OrganizationType.COMPANY);
    });
  });

  describe('Join vs Follow Distinction', () => {
    let communityId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Open Source Community',
          type: OrganizationType.COMMUNITY,
          description: 'Community for OSS contributors',
        });
      communityId = res.body.data.id;
    });

    it('should allow user to JOIN organization as a member', async () => {
      // User Two joins
      const joinRes = await request(app)
        .post(`/api/organizations/${communityId}/join`)
        .set('Authorization', `Bearer ${secondToken}`);

      expect(joinRes.status).toBe(201);
      expect(joinRes.body.data.user_id).toBe(secondUserId);
      expect(joinRes.body.data.role_in_org).toBe(OrgMemberRole.MEMBER);

      // Verify member count is 2 (creator + User Two)
      const orgRes = await request(app).get(`/api/organizations/${communityId}`);
      expect(orgRes.status).toBe(200);
      expect(orgRes.body.data.member_count).toBe(2);
      expect(orgRes.body.data.follower_count).toBe(0);

      // Prevent duplicate join
      const dupRes = await request(app)
        .post(`/api/organizations/${communityId}/join`)
        .set('Authorization', `Bearer ${secondToken}`);
      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error.code).toBe('ALREADY_MEMBER');
    });

    it('should allow user to FOLLOW community without becoming a member', async () => {
      // User Two follows
      const followRes = await request(app)
        .post(`/api/communities/${communityId}/follow`)
        .set('Authorization', `Bearer ${secondToken}`);

      expect(followRes.status).toBe(201);
      expect(followRes.body.data.user_id).toBe(secondUserId);

      // Verify stats: member_count is still 1, follower_count is 1
      const orgRes = await request(app).get(`/api/organizations/${communityId}`);
      expect(orgRes.body.data.member_count).toBe(1);
      expect(orgRes.body.data.follower_count).toBe(1);

      // Verify User Two is NOT in members list
      const membersRes = await request(app).get(`/api/organizations/${communityId}/members`);
      const memberIds = membersRes.body.data.items.map((m: any) => m.user_id);
      expect(memberIds).not.toContain(secondUserId);

      // Prevent duplicate follow
      const dupRes = await request(app)
        .post(`/api/communities/${communityId}/follow`)
        .set('Authorization', `Bearer ${secondToken}`);
      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error.code).toBe('ALREADY_FOLLOWING');

      // Unfollow
      const unfollowRes = await request(app)
        .delete(`/api/communities/${communityId}/follow`)
        .set('Authorization', `Bearer ${secondToken}`);
      expect(unfollowRes.status).toBe(200);

      // Count drops back to 0
      const countRes = await request(app).get(`/api/communities/${communityId}/followers/count`);
      expect(countRes.body.data.follower_count).toBe(0);
    });

    it('enforces privacy: non-admin cannot view follower list', async () => {
      // User Two follows community
      await request(app)
        .post(`/api/communities/${communityId}/follow`)
        .set('Authorization', `Bearer ${secondToken}`);

      // User Two tries to inspect follower identities -> 403 Forbidden
      const forbiddenRes = await request(app)
        .get(`/api/communities/${communityId}/followers`)
        .set('Authorization', `Bearer ${secondToken}`);
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

      // Creator (community admin) CAN inspect follower list
      const allowedRes = await request(app)
        .get(`/api/communities/${communityId}/followers`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.data.items).toHaveLength(1);
      expect(allowedRes.body.data.items[0].user_id).toBe(secondUserId);
    });
  });

  describe('Community Admin Role Assignment', () => {
    let orgId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Tech Leaders Community',
          type: OrganizationType.COMMUNITY,
        });
      orgId = res.body.data.id;
    });

    it('should allow owner to assign community_admin role to another user', async () => {
      const assignRes = await request(app)
        .post(`/api/organizations/${orgId}/admin`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ user_id: secondUserId });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.target_user_id).toBe(secondUserId);

      // Verify second user now has community admin access
      const followersRes = await request(app)
        .get(`/api/communities/${orgId}/followers`)
        .set('Authorization', `Bearer ${secondToken}`);
      expect(followersRes.status).toBe(200);
    });

    it('should reject unauthorized user from assigning community admin', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/admin`)
        .set('Authorization', `Bearer ${secondToken}`)
        .send({ user_id: userId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Verified Boolean Toggle (Admin Action)', () => {
    let orgId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'University AI Lab',
          type: OrganizationType.UNIVERSITY,
        });
      orgId = res.body.data.id;
    });

    it('should reject non-platform-admin from toggling verified status', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${orgId}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ verified: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow platform_admin to toggle verified status and log to audit', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${orgId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verified: true });

      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);

      // Verify persistence
      const getRes = await request(app).get(`/api/organizations/${orgId}`);
      expect(getRes.body.data.verified).toBe(true);

      // Check AuditLog entry exists
      const auditLog = memoryDb.auditLogs.find(
        (log) => log.action === 'organization.verified_toggled' && log.target_id === orgId
      );
      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_user_id).toBe(adminId);
    });
  });
});
