import request from 'supertest';
import { app } from '../app';
import {
  EventCategory,
  EventFormat,
  EventStatus,
  OrganizationType,
  RegistrationStatus,
  RoleType,
} from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Events Module & Ticket/Certificate Flow (Phase 3)', () => {
  let organizerToken: string;
  let organizerUserId: string;
  let attendeeToken: string;
  let attendeeUserId: string;
  let outsiderToken: string;
  let orgId: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. Organizer User
    const regOrg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'organizer@eventops.local',
        password: 'Password123!',
        name: 'Olivia Organizer',
        roles: [RoleType.ORGANIZER],
      });
    organizerToken = regOrg.body.data.tokens.accessToken;
    organizerUserId = regOrg.body.data.user.id;

    // 2. Attendee User
    const regAtt = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'attendee@eventops.local',
        password: 'Password123!',
        name: 'Adam Attendee',
        roles: [RoleType.ATTENDEE],
      });
    attendeeToken = regAtt.body.data.tokens.accessToken;
    attendeeUserId = regAtt.body.data.user.id;

    // 3. Outsider User
    const regOut = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'outsider@eventops.local',
        password: 'Password123!',
        name: 'Oscar Outsider',
        roles: [RoleType.ATTENDEE],
      });
    outsiderToken = regOut.body.data.tokens.accessToken;

    // Create Organizer's Organization
    const orgRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'Tech Events Worldwide',
        type: OrganizationType.COMMUNITY,
        description: 'Global tech events organizer',
      });
    orgId = orgRes.body.data.id;
  });

  describe('Event CRUD and Discovery', () => {
    it('should create an event in draft status and publish it', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          organizer_org_id: orgId,
          title: 'Full Stack Summit 2026',
          description: 'A deep dive into modular monoliths and modern cloud architectures.',
          category: EventCategory.TECH,
          format: EventFormat.OFFLINE,
          start_date: new Date(Date.now() + 86400000).toISOString(),
          end_date: new Date(Date.now() + 90000000).toISOString(),
          location: 'Berlin Tech Hub, Germany',
          capacity: 100,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.title).toBe('Full Stack Summit 2026');
      expect(createRes.body.data.status).toBe(EventStatus.DRAFT);
      const eventId = createRes.body.data.id;

      // Publish event
      const pubRes = await request(app)
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe(EventStatus.PUBLISHED);
    });

    it('should filter events by category, format, and search keyword', async () => {
      // Create Event 1 (Tech, Offline)
      const e1 = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          organizer_org_id: orgId,
          title: 'Kubernetes Workshop',
          description: 'Container orchestration deep-dive.',
          category: EventCategory.TECH,
          format: EventFormat.OFFLINE,
          start_date: new Date(Date.now() + 100000).toISOString(),
          end_date: new Date(Date.now() + 200000).toISOString(),
          location: 'San Francisco, CA',
          capacity: 50,
        });
      await request(app)
        .patch(`/api/events/${e1.body.data.id}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);

      // Create Event 2 (Design, Online)
      const e2 = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          organizer_org_id: orgId,
          title: 'UI/UX Design Masterclass',
          description: 'Design systems and accessibility.',
          category: EventCategory.DESIGN,
          format: EventFormat.ONLINE,
          start_date: new Date(Date.now() + 300000).toISOString(),
          end_date: new Date(Date.now() + 400000).toISOString(),
          capacity: 200,
        });
      await request(app)
        .patch(`/api/events/${e2.body.data.id}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);

      // Filter by category TECH
      const techRes = await request(app).get('/api/events?category=tech');
      expect(techRes.status).toBe(200);
      expect(techRes.body.data.items).toHaveLength(1);
      expect(techRes.body.data.items[0].title).toBe('Kubernetes Workshop');

      // Filter by format ONLINE
      const onlineRes = await request(app).get('/api/events?format=online');
      expect(onlineRes.status).toBe(200);
      expect(onlineRes.body.data.items).toHaveLength(1);
      expect(onlineRes.body.data.items[0].title).toBe('UI/UX Design Masterclass');

      // Filter by search query
      const searchRes = await request(app).get('/api/events?search=Masterclass');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.items).toHaveLength(1);
      expect(searchRes.body.data.items[0].title).toBe('UI/UX Design Masterclass');
    });
  });

  describe('Full Registration -> Check-In -> Certificate Flow', () => {
    let eventId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          organizer_org_id: orgId,
          title: 'DevOps & Cloud Day 2026',
          description: 'Premier DevOps gathering.',
          category: EventCategory.TECH,
          format: EventFormat.OFFLINE,
          start_date: new Date(Date.now() + 50000).toISOString(),
          end_date: new Date(Date.now() + 100000).toISOString(),
          location: 'Munich, Germany',
          capacity: 2, // low capacity to test limit
        });
      eventId = createRes.body.data.id;

      await request(app)
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`);
    });

    it('should register attendee, generate signed QR code, check-in, mark attended, and issue certificate', async () => {
      // 1. REGISTER
      const regRes = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(regRes.status).toBe(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.data).toHaveProperty('registration');
      expect(regRes.body.data).toHaveProperty('ticket');

      const { ticket, registration } = regRes.body.data;
      expect(registration.status).toBe(RegistrationStatus.REGISTERED);
      expect(ticket.ticket_code).toBeDefined();
      expect(ticket.signature).toBeDefined();
      expect(ticket.qr_code_data_url).toContain('data:image/png;base64');

      const qrPayloadString = ticket.qr_payload;
      const parsedQr = JSON.parse(qrPayloadString);
      expect(parsedQr.registrationId).toBe(registration.id);
      expect(parsedQr.eventId).toBe(eventId);
      expect(parsedQr.userId).toBe(attendeeUserId);
      expect(parsedQr.signature).toBe(ticket.signature);

      // 2. CHECK-IN (Scan QR code -> Transitions to CHECKED_IN)
      const checkInRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ qrPayload: qrPayloadString });

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.data.registration.status).toBe(RegistrationStatus.CHECKED_IN);
      expect(checkInRes.body.data.registration.checked_in_at).not.toBeNull();
      // Certificate is not yet issued until attended
      expect(checkInRes.body.data.certificate).toBeNull();

      // 3. MARK ATTENDED (Scan or complete event -> Transitions to ATTENDED & Issues Certificate)
      const attendRes = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          qrPayload: qrPayloadString,
          targetStatus: RegistrationStatus.ATTENDED,
        });

      expect(attendRes.status).toBe(200);
      expect(attendRes.body.data.registration.status).toBe(RegistrationStatus.ATTENDED);
      expect(attendRes.body.data.certificate).not.toBeNull();
      expect(attendRes.body.data.certificate.verification_id).toMatch(/^EO-CERT-/);

      const verificationId = attendRes.body.data.certificate.verification_id;

      // 4. PUBLIC CERTIFICATE VERIFICATION (GET /api/certificates/verify/:verificationId)
      const verifyRes = await request(app).get(`/api/certificates/verify/${verificationId}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.valid).toBe(true);
      expect(verifyRes.body.data.certificate.verification_id).toBe(verificationId);
      expect(verifyRes.body.data.certificate.attendee_name).toBe('Adam Attendee');
      expect(verifyRes.body.data.certificate.event_title).toBe('DevOps & Cloud Day 2026');
      expect(verifyRes.body.data.certificate.organizer_name).toBe('Tech Events Worldwide');
    });

    it('should reject check-in if QR payload signature is tampered with', async () => {
      // Register attendee
      const regRes = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      const { ticket } = regRes.body.data;
      const parsedQr = JSON.parse(ticket.qr_payload);

      // Tamper signature
      parsedQr.signature = 'tampered_fake_signature_abc123';
      const tamperedPayload = JSON.stringify(parsedQr);

      const res = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ qrPayload: tamperedPayload });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TICKET_SIGNATURE');
    });

    it('should reject non-organizer from checking in attendees', async () => {
      const regRes = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      const { ticket } = regRes.body.data;

      const res = await request(app)
        .post(`/api/events/${eventId}/check-in`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ qrPayload: ticket.qr_payload });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should enforce event capacity', async () => {
      // 1st attendee registers (capacity is 2)
      await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      // 2nd attendee registers
      await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      // 3rd user tries to register
      const thirdUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'third@example.com',
          password: 'Password123!',
          name: 'Third Attendee',
        });
      const thirdToken = thirdUser.body.data.tokens.accessToken;

      const fullRes = await request(app)
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${thirdToken}`);

      expect(fullRes.status).toBe(400);
      expect(fullRes.body.error.code).toBe('EVENT_CAPACITY_FULL');
    });
  });
});
