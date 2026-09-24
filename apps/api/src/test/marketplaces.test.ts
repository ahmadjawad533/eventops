import request from 'supertest';
import { app } from '../app';
import {
  EventCategory,
  EventFormat,
  OrganizationType,
  RoleType,
  SponsorshipStatus,
  VenueRequestStatus,
} from '@eventops/shared-types';
import { memoryDb } from '../core/memoryDb';

describe('Phase 6 — Sponsorship & Venue Marketplaces', () => {
  let organizerToken: string;
  let organizerOrgId: string;
  let eventId: string;

  let sponsorToken: string;
  let sponsorOrgId: string;

  let venueOwnerToken: string;
  let venueOrgId: string;

  let outsiderToken: string;

  beforeEach(async () => {
    memoryDb.clear();

    // 1. Event Organizer User & Org
    const orgRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'organizer@summit.org',
        password: 'Password123!',
        name: 'Olivia Organizer',
        roles: [RoleType.ORGANIZER],
      });
    organizerToken = orgRes.body.data.tokens.accessToken;

    const orgCreate = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: 'Tech Events Worldwide',
        type: OrganizationType.COMMUNITY,
        description: 'Organizing worldwide tech summits',
      });
    organizerOrgId = orgCreate.body.data.id;

    // Create an Event under Organizer Org
    const evCreate = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizer_org_id: organizerOrgId,
        title: 'Cloud Native Berlin 2026',
        description: 'Premier cloud native conference',
        category: EventCategory.TECH,
        format: EventFormat.OFFLINE,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        location: 'Berlin Convention Center',
        capacity: 500,
      });
    eventId = evCreate.body.data.id;

    // 2. Sponsor User & Org
    const spRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'sponsor@cloudcorp.io',
        password: 'Password123!',
        name: 'Sam Sponsor',
        roles: [RoleType.SPONSOR],
      });
    sponsorToken = spRes.body.data.tokens.accessToken;

    const spOrgCreate = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${sponsorToken}`)
      .send({
        name: 'CloudCorp Technologies',
        type: OrganizationType.COMPANY,
        description: 'Enterprise cloud solutions provider',
      });
    sponsorOrgId = spOrgCreate.body.data.id;

    // 3. Venue Owner User & Org
    const voRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'owner@berlinvenues.de',
        password: 'Password123!',
        name: 'Victor Venue',
        roles: [RoleType.VENUE_OWNER],
      });
    venueOwnerToken = voRes.body.data.tokens.accessToken;

    const voOrgCreate = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${venueOwnerToken}`)
      .send({
        name: 'Berlin Event Spaces GmbH',
        type: OrganizationType.COMPANY,
        description: 'Modern convention and event halls',
      });
    venueOrgId = voOrgCreate.body.data.id;

    // 4. Outsider / Regular Attendee
    const outRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'outsider@gmail.com',
        password: 'Password123!',
        name: 'Oscar Outsider',
        roles: [RoleType.ATTENDEE],
      });
    outsiderToken = outRes.body.data.tokens.accessToken;
  });

  describe('Sponsorship Marketplace & CRM Pipeline', () => {
    it('allows event organizer to post a SponsorshipOpportunity', async () => {
      const res = await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          title: 'Gold & Silver Sponsorship Packages',
          needs: {
            catering: true,
            booth: true,
            swag: true,
            general: true,
            tiers: ['Silver: $2,500', 'Gold: $5,000', 'Platinum: $10,000'],
          },
          budget_range: '$5,000 - $10,000',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Gold & Silver Sponsorship Packages');
      expect(res.body.data.budget_range).toBe('$5,000 - $10,000');
      expect(res.body.data.event_id).toBe(eventId);
    });

    it('rejects sponsorship opportunity creation by unauthorized outsider (403)', async () => {
      const res = await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          event_id: eventId,
          title: 'Unauthorized Opportunity',
          needs: { booth: true },
        });

      expect(res.status).toBe(403);
    });

    it('lists and filters sponsorship opportunities', async () => {
      // Create opportunity
      await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          title: 'Premier Cloud Stage Sponsor',
          needs: { booth: true },
          budget_range: '$10,000+',
        });

      // Filter by search
      const listRes = await request(app)
        .get('/api/sponsorship/opportunities?search=Cloud')
        .set('Authorization', `Bearer ${sponsorToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBe(1);
      expect(listRes.body.data.items[0].title).toBe('Premier Cloud Stage Sponsor');
    });

    it('allows sponsor to apply to an opportunity and prevents duplicate applications', async () => {
      // 1. Create opportunity
      const oppRes = await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          title: 'Keynote Stage Sponsor',
          needs: { booth: true, stage_time: true },
          budget_range: '$8,000',
        });
      const oppId = oppRes.body.data.id;

      // 2. Sponsor applies
      const applyRes = await request(app)
        .post(`/api/sponsorship/opportunities/${oppId}/apply`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          sponsor_org_id: sponsorOrgId,
          notes: 'CloudCorp would love to sponsor keynote and provide booth swag.',
        });

      expect(applyRes.status).toBe(201);
      expect(applyRes.body.data.status).toBe(SponsorshipStatus.POTENTIAL);
      expect(applyRes.body.data.notes).toContain('CloudCorp');

      // 3. Duplicate application should fail
      const dupRes = await request(app)
        .post(`/api/sponsorship/opportunities/${oppId}/apply`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          sponsor_org_id: sponsorOrgId,
          notes: 'Second attempt',
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error.code).toBe('DUPLICATE_APPLICATION');
    });

    it('allows organizer to progress application across the full CRM pipeline', async () => {
      // 1. Create opportunity & apply
      const oppRes = await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          title: 'Lunch & Networking Sponsor',
          needs: { catering: true },
        });
      const oppId = oppRes.body.data.id;

      const appRes = await request(app)
        .post(`/api/sponsorship/opportunities/${oppId}/apply`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          sponsor_org_id: sponsorOrgId,
          notes: 'Interested in catering sponsor',
        });
      const appId = appRes.body.data.id;

      // 2. Pipeline sequence: potential -> contacted -> interested -> negotiation -> confirmed -> completed
      const stages: SponsorshipStatus[] = [
        SponsorshipStatus.CONTACTED,
        SponsorshipStatus.INTERESTED,
        SponsorshipStatus.NEGOTIATION,
        SponsorshipStatus.CONFIRMED,
        SponsorshipStatus.COMPLETED,
      ];

      for (const stage of stages) {
        const updateRes = await request(app)
          .patch(`/api/sponsorship/applications/${appId}/status`)
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            status: stage,
            notes: `Advanced to ${stage}`,
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.status).toBe(stage);
      }

      // Verify audit log has recorded the pipeline transitions
      const auditLogs = memoryDb.auditLogs.filter(
        (l) => l.action === 'sponsorship.application.status_updated'
      );
      expect(auditLogs.length).toBe(stages.length);
    });

    it('rejects unauthorized user from changing application status (403)', async () => {
      const oppRes = await request(app)
        .post('/api/sponsorship/opportunities')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          event_id: eventId,
          title: 'Coffee Break Sponsor',
          needs: { catering: true },
        });
      const oppId = oppRes.body.data.id;

      const appRes = await request(app)
        .post(`/api/sponsorship/opportunities/${oppId}/apply`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          sponsor_org_id: sponsorOrgId,
        });
      const appId = appRes.body.data.id;

      const unauthorizedRes = await request(app)
        .patch(`/api/sponsorship/applications/${appId}/status`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          status: SponsorshipStatus.CONFIRMED,
        });

      expect(unauthorizedRes.status).toBe(403);
    });
  });

  describe('Venue Marketplace & Booking Requests', () => {
    let venueId: string;

    it('allows venue owner to list a Venue with capacity and facilities', async () => {
      const res = await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Spree Arena & Innovation Center',
          capacity: 450,
          facilities: {
            av: true,
            projector: true,
            stage: true,
            wifi: true,
            catering: true,
            parking: true,
          },
          city: 'Berlin',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Spree Arena & Innovation Center');
      expect(res.body.data.capacity).toBe(450);
      expect(res.body.data.city).toBe('Berlin');
      expect(res.body.data.facilities.projector).toBe(true);

      venueId = res.body.data.id;
    });

    it('rejects venue creation from unauthorized user (403)', async () => {
      const res = await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Unauthorized Hall',
          capacity: 100,
          facilities: {},
          city: 'Munich',
        });

      expect(res.status).toBe(403);
    });

    it('filters venue directory by capacity range, city, and facilities', async () => {
      // 1. Create venue 1 (Berlin, 300, stage)
      await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Berlin Tech Loft',
          capacity: 300,
          facilities: { stage: true, wifi: true },
          city: 'Berlin',
        });

      // 2. Create venue 2 (Hamburg, 100, wifi only)
      await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Hamburg Startup Hub',
          capacity: 100,
          facilities: { wifi: true },
          city: 'Hamburg',
        });

      // Query Berlin venues with min capacity 200
      const queryRes = await request(app)
        .get('/api/venues?city=Berlin&min_capacity=200')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(queryRes.status).toBe(200);
      expect(queryRes.body.data.items.length).toBe(1);
      expect(queryRes.body.data.items[0].name).toBe('Berlin Tech Loft');

      // Query by facility: stage
      const stageRes = await request(app)
        .get('/api/venues?facility=stage')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(stageRes.status).toBe(200);
      expect(stageRes.body.data.items.length).toBe(1);
      expect(stageRes.body.data.items[0].facilities.stage).toBe(true);
    });

    it('allows organizer to request a booking, venue owner counters, then accepts', async () => {
      // 1. Create venue
      const vRes = await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Mitte Expo Hall',
          capacity: 600,
          facilities: { av: true, wifi: true },
          city: 'Berlin',
        });
      const testVenueId = vRes.body.data.id;

      // 2. Organizer requests booking
      const bookRes = await request(app)
        .post(`/api/venues/${testVenueId}/requests`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venue_id: testVenueId,
          event_id: eventId,
          requesting_org_id: organizerOrgId,
          notes: 'Requesting hall for 2 full days with AV setup.',
        });

      expect(bookRes.status).toBe(201);
      expect(bookRes.body.data.status).toBe(VenueRequestStatus.REQUESTED);
      const reqId = bookRes.body.data.id;

      // 3. Venue owner counters request
      const counterRes = await request(app)
        .patch(`/api/venues/requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          action: 'counter',
          notes: 'Available for both days, but AV setup requires 2 hours early access.',
        });

      expect(counterRes.status).toBe(200);
      expect(counterRes.body.data.status).toBe(VenueRequestStatus.COUNTERED);
      expect(counterRes.body.data.notes).toContain('AV setup requires');

      // 4. Venue owner accepts request
      const acceptRes = await request(app)
        .patch(`/api/venues/requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          action: 'accept',
          notes: 'Terms agreed. Booking confirmed.',
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe(VenueRequestStatus.ACCEPTED);

      // Verify audit logs
      const counterLog = memoryDb.auditLogs.find(
        (l) => l.action === 'venue.request.counter' && l.target_id === reqId
      );
      const acceptLog = memoryDb.auditLogs.find(
        (l) => l.action === 'venue.request.accept' && l.target_id === reqId
      );
      expect(counterLog).toBeDefined();
      expect(acceptLog).toBeDefined();
    });

    it('rejects booking response from non-venue-owner user (403)', async () => {
      const vRes = await request(app)
        .post('/api/venues')
        .set('Authorization', `Bearer ${venueOwnerToken}`)
        .send({
          owner_org_id: venueOrgId,
          name: 'Kreuzberg Hall',
          capacity: 250,
          facilities: {},
          city: 'Berlin',
        });
      const testVenueId = vRes.body.data.id;

      const bookRes = await request(app)
        .post(`/api/venues/${testVenueId}/requests`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venue_id: testVenueId,
          event_id: eventId,
          requesting_org_id: organizerOrgId,
        });
      const reqId = bookRes.body.data.id;

      const unauthorizedRes = await request(app)
        .patch(`/api/venues/requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          action: 'accept',
        });

      expect(unauthorizedRes.status).toBe(403);
    });
  });
});
