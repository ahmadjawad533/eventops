import request from 'supertest';
import { app } from '../app';
import { RoleType } from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Auth & Users Module (Phase 1)', () => {
  beforeEach(() => {
    memoryDb.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with default attendee role and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
          name: 'Alice Developer',
          interests: ['react', 'node', 'typescript'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.name).toBe('Alice Developer');
      expect(res.body.data.user.interests).toEqual(['react', 'node', 'typescript']);
      expect(res.body.data.user).not.toHaveProperty('password_hash');

      // Check default role
      expect(res.body.data).toHaveProperty('roles');
      expect(res.body.data.roles).toHaveLength(1);
      expect(res.body.data.roles[0].role_type).toBe(RoleType.ATTENDEE);

      // Check tokens
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should support registering with multiple roles simultaneously', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'Password123!',
          name: 'Bob Organizer',
          roles: [RoleType.ATTENDEE, RoleType.ORGANIZER, RoleType.COMMUNITY_ADMIN],
        });

      expect(res.status).toBe(201);
      const roles = res.body.data.roles.map((r: any) => r.role_type);
      expect(roles).toContain(RoleType.ATTENDEE);
      expect(roles).toContain(RoleType.ORGANIZER);
      expect(roles).toContain(RoleType.COMMUNITY_ADMIN);
    });

    it('should reject registration if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Invalid Email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'charlie@example.com',
          password: 'short',
          name: 'Charlie Short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Original User',
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Copycat User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login.test@example.com',
          password: 'SecretPassword123!',
          name: 'Login Tester',
        });
    });

    it('should log in successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'SecretPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('login.test@example.com');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecretPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue a new access token given a valid refresh token', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refresh.test@example.com',
          password: 'Password123!',
          name: 'Refresh Tester',
        });

      const { refreshToken } = regRes.body.data.tokens;

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.tokens).toHaveProperty('accessToken');
      expect(refreshRes.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 when given an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile and roles with valid token', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me.test@example.com',
          password: 'Password123!',
          name: 'Me Tester',
        });

      const token = regRes.body.data.tokens.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me.test@example.com');
      expect(res.body.data.roles).toHaveLength(1);
    });

    it('should reject request when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Profile & Interests Management (/api/users)', () => {
    let token: string;

    beforeEach(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'profile.user@example.com',
          password: 'Password123!',
          name: 'Original Name',
          interests: ['tech'],
        });
      token = regRes.body.data.tokens.accessToken;
    });

    it('should update user profile with new name and interests tags', async () => {
      const updateRes = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          interests: ['tech', 'startups', 'devops', 'open-source'],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Updated Name');
      expect(updateRes.body.data.interests).toEqual(['tech', 'startups', 'devops', 'open-source']);

      // Verify persistence via GET /api/users/profile
      const getRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.user.name).toBe('Updated Name');
      expect(getRes.body.data.user.interests).toEqual(['tech', 'startups', 'devops', 'open-source']);
    });
  });

  describe('Multi-Role Support & RBAC', () => {
    it('should allow user to assign an additional role to their account', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'multirole@example.com',
          password: 'Password123!',
          name: 'Multi Role User',
        });

      const token = regRes.body.data.tokens.accessToken;

      // Assign ORGANIZER role
      const addRoleRes = await request(app)
        .post('/api/users/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role_type: RoleType.ORGANIZER,
        });

      expect(addRoleRes.status).toBe(201);
      expect(addRoleRes.body.data.role_type).toBe(RoleType.ORGANIZER);

      // Verify user now holds both roles
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      const roles = meRes.body.data.roles.map((r: any) => r.role_type);
      expect(roles).toContain(RoleType.ATTENDEE);
      expect(roles).toContain(RoleType.ORGANIZER);
    });

    it('should reject assigning the exact same role twice to the same user', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate.role@example.com',
          password: 'Password123!',
          name: 'Duplicate Role User',
        });

      const token = regRes.body.data.tokens.accessToken;

      const res = await request(app)
        .post('/api/users/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role_type: RoleType.ATTENDEE, // already has ATTENDEE by default
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ROLE_ALREADY_ASSIGNED');
    });

    it('should enforce RBAC on role-protected endpoints', async () => {
      // 1. Create ATTENDEE only user
      const attendeeRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'attendee.only@example.com',
          password: 'Password123!',
          name: 'Attendee Only',
          roles: [RoleType.ATTENDEE],
        });

      const attendeeToken = attendeeRes.body.data.tokens.accessToken;

      // GET /api/users requires ORGANIZER or PLATFORM_ADMIN
      const forbiddenRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

      // 2. Create ORGANIZER user
      const organizerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'organizer.user@example.com',
          password: 'Password123!',
          name: 'Organizer User',
          roles: [RoleType.ORGANIZER],
        });

      const organizerToken = organizerRes.body.data.tokens.accessToken;

      const allowedRes = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.data).toHaveProperty('items');
      expect(allowedRes.body.data).toHaveProperty('meta');
      expect(allowedRes.body.data.meta.page).toBe(1);
    });
  });
});
