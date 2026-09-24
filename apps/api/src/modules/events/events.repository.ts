import {
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
} from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb, DbEvent, DbEventRegistration, DbCertificate } from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class EventsRepository {
  public async create(data: {
    organizer_org_id: string;
    title: string;
    description: string;
    category: EventCategory;
    format: EventFormat;
    start_date: Date;
    end_date: Date;
    location?: string | null;
    capacity: number;
    status?: EventStatus;
  }) {
    try {
      return await prisma.event.create({
        data: {
          organizer_org_id: data.organizer_org_id,
          title: data.title,
          description: data.description,
          category: data.category as any,
          format: data.format as any,
          start_date: data.start_date,
          end_date: data.end_date,
          location: data.location || null,
          capacity: data.capacity,
          status: (data.status || EventStatus.DRAFT) as any,
        },
      });
    } catch (error) {
      logger.debug('Prisma create event failed, using memory store');
      return memoryDb.createEvent(data);
    }
  }

  public async findById(id: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: { organizer: true },
      });
      return event;
    } catch (error) {
      logger.debug('Prisma findById event failed, using memory store');
      const event = memoryDb.findEventById(id);
      if (!event) return null;
      const org = memoryDb.findOrganizationById(event.organizer_org_id);
      return { ...event, organizer: org || undefined };
    }
  }

  public async update(id: string, updates: Partial<DbEvent>) {
    try {
      return await prisma.event.update({
        where: { id },
        data: updates as any,
      });
    } catch (error) {
      return memoryDb.updateEvent(id, updates);
    }
  }

  public async findPaginated(options: {
    category?: EventCategory;
    format?: EventFormat;
    status?: EventStatus;
    location?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    organizer_org_id?: string;
    page: number;
    limit: number;
  }) {
    const { category, format, status, location, search, startDate, endDate, organizer_org_id, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (category) where.category = category;
      if (format) where.format = format;
      if (status) where.status = status;
      if (organizer_org_id) where.organizer_org_id = organizer_org_id;
      if (location) where.location = { contains: location, mode: 'insensitive' };
      if (startDate) where.start_date = { gte: startDate };
      if (endDate) where.end_date = { lte: endDate };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.event.findMany({
          where,
          skip,
          take: limit,
          orderBy: { start_date: 'asc' },
          include: { organizer: true },
        }),
        prisma.event.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findPaginated events failed, using memory store');
      const res = memoryDb.findEvents({
        category,
        format,
        status,
        location,
        search,
        startDate,
        endDate,
        organizer_org_id,
        skip,
        take: limit,
      });
      const items = res.items.map((e) => {
        const org = memoryDb.findOrganizationById(e.organizer_org_id);
        return { ...e, organizer: org || undefined };
      });
      return { items, total: res.total };
    }
  }

  // --- Registrations ---
  public async createRegistration(data: {
    event_id: string;
    user_id: string;
    ticket_code: string;
    status?: RegistrationStatus;
  }) {
    try {
      return await prisma.eventRegistration.create({
        data: {
          event_id: data.event_id,
          user_id: data.user_id,
          ticket_code: data.ticket_code,
          status: (data.status || RegistrationStatus.REGISTERED) as any,
        },
      });
    } catch (error) {
      return memoryDb.createRegistration(data);
    }
  }

  public async findRegistrationById(id: string) {
    try {
      return await prisma.eventRegistration.findUnique({
        where: { id },
        include: { event: { include: { organizer: true } }, user: true, certificate: true },
      });
    } catch (error) {
      const reg = memoryDb.findRegistrationById(id);
      if (!reg) return null;
      const event = memoryDb.findEventById(reg.event_id);
      const user = memoryDb.findUserById(reg.user_id);
      const cert = memoryDb.findCertificateByRegistrationId(id);
      const org = event ? memoryDb.findOrganizationById(event.organizer_org_id) : null;
      return {
        ...reg,
        event: event ? { ...event, organizer: org || undefined } : undefined,
        user: user || undefined,
        certificate: cert || undefined,
      };
    }
  }

  public async findRegistrationByTicketCode(ticketCode: string) {
    try {
      return await prisma.eventRegistration.findUnique({
        where: { ticket_code: ticketCode },
        include: { event: { include: { organizer: true } }, user: true, certificate: true },
      });
    } catch (error) {
      const reg = memoryDb.findRegistrationByTicketCode(ticketCode);
      if (!reg) return null;
      const event = memoryDb.findEventById(reg.event_id);
      const user = memoryDb.findUserById(reg.user_id);
      const cert = memoryDb.findCertificateByRegistrationId(reg.id);
      const org = event ? memoryDb.findOrganizationById(event.organizer_org_id) : null;
      return {
        ...reg,
        event: event ? { ...event, organizer: org || undefined } : undefined,
        user: user || undefined,
        certificate: cert || undefined,
      };
    }
  }

  public async findRegistration(eventId: string, userId: string) {
    try {
      return await prisma.eventRegistration.findUnique({
        where: { event_id_user_id: { event_id: eventId, user_id: userId } },
      });
    } catch (error) {
      return memoryDb.findRegistration(eventId, userId);
    }
  }

  public async countRegistrations(eventId: string): Promise<number> {
    try {
      return await prisma.eventRegistration.count({ where: { event_id: eventId } });
    } catch (error) {
      return memoryDb.countRegistrations(eventId);
    }
  }

  public async updateRegistrationStatus(id: string, status: RegistrationStatus, checkedInAt?: Date | null) {
    try {
      return await prisma.eventRegistration.update({
        where: { id },
        data: {
          status: status as any,
          checked_in_at: checkedInAt,
        },
      });
    } catch (error) {
      return memoryDb.updateRegistration(id, { status, checked_in_at: checkedInAt });
    }
  }

  public async getEventRegistrations(eventId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [items, total] = await Promise.all([
        prisma.eventRegistration.findMany({
          where: { event_id: eventId },
          skip,
          take: limit,
          include: {
            user: { select: { id: true, name: true, email: true, avatar_url: true } },
            certificate: true,
          },
          orderBy: { registered_at: 'desc' },
        }),
        prisma.eventRegistration.count({ where: { event_id: eventId } }),
      ]);
      return { items, total };
    } catch (error) {
      const res = memoryDb.getEventRegistrations(eventId, skip, limit);
      const items = res.items.map((r) => {
        const u = memoryDb.findUserById(r.user_id);
        const cert = memoryDb.findCertificateByRegistrationId(r.id);
        return {
          ...r,
          user: u ? { id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url } : undefined,
          certificate: cert || undefined,
        };
      });
      return { items, total: res.total };
    }
  }

  public async getUserRegistrations(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [items, total] = await Promise.all([
        prisma.eventRegistration.findMany({
          where: { user_id: userId },
          skip,
          take: limit,
          include: {
            event: { include: { organizer: true } },
            certificate: true,
          },
          orderBy: { registered_at: 'desc' },
        }),
        prisma.eventRegistration.count({ where: { user_id: userId } }),
      ]);
      return { items, total };
    } catch (error) {
      const res = memoryDb.getUserRegistrations(userId, skip, limit);
      const items = res.items.map((r) => {
        const ev = memoryDb.findEventById(r.event_id);
        const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;
        const cert = memoryDb.findCertificateByRegistrationId(r.id);
        return {
          ...r,
          event: ev ? { ...ev, organizer: org || undefined } : undefined,
          certificate: cert || undefined,
        };
      });
      return { items, total: res.total };
    }
  }

  // --- Certificates ---
  public async createCertificate(data: { registration_id: string; verification_id: string }) {
    try {
      return await prisma.certificate.create({
        data: {
          registration_id: data.registration_id,
          verification_id: data.verification_id,
        },
      });
    } catch (error) {
      return memoryDb.createCertificate(data);
    }
  }

  public async findCertificateByVerificationId(verificationId: string) {
    try {
      return await prisma.certificate.findUnique({
        where: { verification_id: verificationId },
        include: {
          registration: {
            include: {
              user: true,
              event: {
                include: { organizer: true },
              },
            },
          },
        },
      });
    } catch (error) {
      const cert = memoryDb.findCertificateByVerificationId(verificationId);
      if (!cert) return null;
      const reg = memoryDb.findRegistrationById(cert.registration_id);
      if (!reg) return null;
      const user = memoryDb.findUserById(reg.user_id);
      const event = memoryDb.findEventById(reg.event_id);
      const org = event ? memoryDb.findOrganizationById(event.organizer_org_id) : null;
      return {
        ...cert,
        registration: {
          ...reg,
          user: user || undefined,
          event: event ? { ...event, organizer: org || undefined } : undefined,
        },
      };
    }
  }

  public async findCertificateByRegistrationId(registrationId: string) {
    try {
      return await prisma.certificate.findUnique({
        where: { registration_id: registrationId },
      });
    } catch (error) {
      return memoryDb.findCertificateByRegistrationId(registrationId);
    }
  }

  public async findOrgMember(orgId: string, userId: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: { org_id_user_id: { org_id: orgId, user_id: userId } },
      });
    } catch (error) {
      return memoryDb.findMember(orgId, userId);
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
          metadata: data.metadata || undefined,
        },
      });
    } catch (error) {
      return memoryDb.createAuditLog(data);
    }
  }
}

export const eventsRepository = new EventsRepository();
