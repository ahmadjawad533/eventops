import { VenueRequestStatus } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import {
  memoryDb,
  DbVenue,
  DbVenueRequest,
} from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class VenuesRepository {
  public async createVenue(data: {
    owner_org_id: string;
    name: string;
    capacity: number;
    facilities: Record<string, any>;
    city: string;
  }) {
    try {
      return await prisma.venue.create({
        data: {
          owner_org_id: data.owner_org_id,
          name: data.name,
          capacity: data.capacity,
          facilities: data.facilities as any,
          city: data.city,
        },
        include: {
          owner_org: true,
          requests: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma createVenue failed, using memory store');
      const venue = memoryDb.createVenue(data);
      const org = memoryDb.findOrganizationById(venue.owner_org_id);
      return {
        ...venue,
        owner_org: org || undefined,
        requests: [],
      };
    }
  }

  public async findVenueById(id: string) {
    try {
      return await prisma.venue.findUnique({
        where: { id },
        include: {
          owner_org: true,
          requests: {
            include: {
              event: true,
              requesting_org: true,
            },
          },
        },
      });
    } catch (error) {
      logger.debug('Prisma findVenueById failed, using memory store');
      const venue = memoryDb.findVenueById(id);
      if (!venue) return null;
      const org = memoryDb.findOrganizationById(venue.owner_org_id);
      const reqs = memoryDb
        .findVenueRequestsPaginated({ venue_id: id, take: 100 })
        .items.map((r) => ({
          ...r,
          event: memoryDb.findEventById(r.event_id) || undefined,
          requesting_org: memoryDb.findOrganizationById(r.requesting_org_id) || undefined,
        }));

      return {
        ...venue,
        owner_org: org || undefined,
        requests: reqs,
      };
    }
  }

  public async findVenuesPaginated(options: {
    city?: string;
    min_capacity?: number;
    max_capacity?: number;
    facility?: string;
    owner_org_id?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { city, min_capacity, max_capacity, facility, owner_org_id, search, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (city) {
        where.city = { contains: city, mode: 'insensitive' };
      }
      if (min_capacity !== undefined || max_capacity !== undefined) {
        where.capacity = {};
        if (min_capacity !== undefined) where.capacity.gte = min_capacity;
        if (max_capacity !== undefined) where.capacity.lte = max_capacity;
      }
      if (owner_org_id) where.owner_org_id = owner_org_id;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            owner_org: true,
            requests: true,
          },
        }),
        prisma.venue.count({ where }),
      ]);

      let filteredItems = items;
      if (facility) {
        filteredItems = items.filter((v: any) => {
          if (!v.facilities || typeof v.facilities !== 'object') return false;
          return Boolean(v.facilities[facility.toLowerCase()]);
        });
      }

      return { items: filteredItems, total: facility ? filteredItems.length : total };
    } catch (error) {
      logger.debug('Prisma findVenuesPaginated failed, using memory store');
      const res = memoryDb.findVenuesPaginated({
        city,
        min_capacity,
        max_capacity,
        facility,
        owner_org_id,
        search,
        skip,
        take: limit,
      });

      const enriched = res.items.map((venue) => {
        const org = memoryDb.findOrganizationById(venue.owner_org_id);
        const reqs = memoryDb.findVenueRequestsPaginated({
          venue_id: venue.id,
          take: 100,
        }).items;
        return {
          ...venue,
          owner_org: org || undefined,
          requests: reqs,
        };
      });

      return { items: enriched, total: res.total };
    }
  }

  public async createBookingRequest(data: {
    venue_id: string;
    event_id: string;
    requesting_org_id: string;
    status?: VenueRequestStatus;
    notes?: string | null;
  }) {
    try {
      return await prisma.venueRequest.create({
        data: {
          venue_id: data.venue_id,
          event_id: data.event_id,
          requesting_org_id: data.requesting_org_id,
          status: (data.status || VenueRequestStatus.REQUESTED) as any,
        },
        include: {
          venue: {
            include: {
              owner_org: true,
            },
          },
          event: true,
          requesting_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma createBookingRequest failed, using memory store');
      const req = memoryDb.createVenueRequest(data);
      const venue = memoryDb.findVenueById(req.venue_id);
      const ownerOrg = venue ? memoryDb.findOrganizationById(venue.owner_org_id) : null;
      const ev = memoryDb.findEventById(req.event_id);
      const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);

      return {
        ...req,
        venue: venue
          ? {
              ...venue,
              owner_org: ownerOrg || undefined,
            }
          : undefined,
        event: ev || undefined,
        requesting_org: reqOrg || undefined,
      };
    }
  }

  public async findBookingRequestById(id: string) {
    try {
      return await prisma.venueRequest.findUnique({
        where: { id },
        include: {
          venue: {
            include: {
              owner_org: true,
            },
          },
          event: true,
          requesting_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma findBookingRequestById failed, using memory store');
      const req = memoryDb.findVenueRequestById(id);
      if (!req) return null;

      const venue = memoryDb.findVenueById(req.venue_id);
      const ownerOrg = venue ? memoryDb.findOrganizationById(venue.owner_org_id) : null;
      const ev = memoryDb.findEventById(req.event_id);
      const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);

      return {
        ...req,
        venue: venue
          ? {
              ...venue,
              owner_org: ownerOrg || undefined,
            }
          : undefined,
        event: ev || undefined,
        requesting_org: reqOrg || undefined,
      };
    }
  }

  public async findBookingRequestsPaginated(options: {
    venue_id?: string;
    event_id?: string;
    requesting_org_id?: string;
    owner_org_id?: string;
    status?: VenueRequestStatus;
    page: number;
    limit: number;
  }) {
    const { venue_id, event_id, requesting_org_id, owner_org_id, status, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (venue_id) where.venue_id = venue_id;
      if (event_id) where.event_id = event_id;
      if (requesting_org_id) where.requesting_org_id = requesting_org_id;
      if (status) where.status = status as any;
      if (owner_org_id) {
        where.venue = { owner_org_id };
      }

      const [items, total] = await Promise.all([
        prisma.venueRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            venue: {
              include: {
                owner_org: true,
              },
            },
            event: true,
            requesting_org: true,
          },
        }),
        prisma.venueRequest.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findBookingRequestsPaginated failed, using memory store');
      const res = memoryDb.findVenueRequestsPaginated({
        venue_id,
        event_id,
        requesting_org_id,
        owner_org_id,
        status,
        skip,
        take: limit,
      });

      const enriched = res.items.map((req) => {
        const venue = memoryDb.findVenueById(req.venue_id);
        const ownerOrg = venue ? memoryDb.findOrganizationById(venue.owner_org_id) : null;
        const ev = memoryDb.findEventById(req.event_id);
        const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);

        return {
          ...req,
          venue: venue
            ? {
                ...venue,
                owner_org: ownerOrg || undefined,
              }
            : undefined,
          event: ev || undefined,
          requesting_org: reqOrg || undefined,
        };
      });

      return { items: enriched, total: res.total };
    }
  }

  public async updateBookingRequest(id: string, updates: Partial<DbVenueRequest>) {
    try {
      return await prisma.venueRequest.update({
        where: { id },
        data: {
          status: updates.status as any,
        },
        include: {
          venue: {
            include: {
              owner_org: true,
            },
          },
          event: true,
          requesting_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma updateBookingRequest failed, using memory store');
      const req = memoryDb.updateVenueRequest(id, updates);
      if (!req) return null;

      const venue = memoryDb.findVenueById(req.venue_id);
      const ownerOrg = venue ? memoryDb.findOrganizationById(venue.owner_org_id) : null;
      const ev = memoryDb.findEventById(req.event_id);
      const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);

      return {
        ...req,
        venue: venue
          ? {
              ...venue,
              owner_org: ownerOrg || undefined,
            }
          : undefined,
        event: ev || undefined,
        requesting_org: reqOrg || undefined,
      };
    }
  }

  public async findOrgMember(org_id: string, user_id: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: {
          org_id_user_id: { org_id, user_id },
        },
      });
    } catch (error) {
      logger.debug('Prisma findOrgMember failed, using memory store');
      return memoryDb.findMember(org_id, user_id);
    }
  }

  public async getUserRoles(user_id: string) {
    try {
      return await prisma.role.findMany({ where: { user_id } });
    } catch (error) {
      logger.debug('Prisma getUserRoles failed, using memory store');
      return memoryDb.getUserRoles(user_id);
    }
  }

  public async createAuditLog(data: {
    actor_user_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    metadata?: any;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          actor_user_id: data.actor_user_id || null,
          action: data.action,
          target_type: data.target_type,
          target_id: data.target_id,
          metadata: data.metadata || null,
        },
      });
    } catch (error) {
      logger.debug('Prisma createAuditLog failed, using memory store');
      return memoryDb.createAuditLog(data);
    }
  }
}

export const venuesRepository = new VenuesRepository();
