import {
  EventCategory,
  EventFormat,
  EventStatus,
  OrgMemberRole,
  RegistrationStatus,
  CreateEventDto,
  UpdateEventDto,
  CheckInDto,
} from '@eventops/shared-types';
import crypto from 'crypto';
import { EventsRepository, eventsRepository } from './events.repository';
import {
  createTicketSignature,
  verifyTicketSignature,
  generateQrCodeDataUrl,
  generateVerificationId,
} from '../../core/ticket.utils';
import { AppError } from '../../middleware/errorHandler';

export class EventsService {
  constructor(private readonly repo: EventsRepository = eventsRepository) {}

  public async createEvent(userId: string, isPlatformAdmin: boolean, dto: CreateEventDto) {
    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(dto.organizer_org_id, userId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organization owners and admins can create events for this organization', 403, 'FORBIDDEN');
      }
    }

    const event = await this.repo.create({
      organizer_org_id: dto.organizer_org_id,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      format: dto.format,
      start_date: new Date(dto.start_date),
      end_date: new Date(dto.end_date),
      location: dto.location,
      capacity: dto.capacity,
      status: EventStatus.DRAFT,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'event.created',
      target_type: 'event',
      target_id: event.id,
      metadata: { title: event.title, organizer_org_id: event.organizer_org_id },
    });

    return {
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at.toISOString(),
      updated_at: event.updated_at.toISOString(),
    };
  }

  public async getEventById(id: string) {
    const event = await this.repo.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const registeredCount = await this.repo.countRegistrations(id);
    const remainingCapacity = Math.max(0, event.capacity - registeredCount);

    return {
      ...event,
      start_date: event.start_date.toISOString(),
      end_date: event.end_date.toISOString(),
      created_at: event.created_at.toISOString(),
      updated_at: event.updated_at.toISOString(),
      registered_count: registeredCount,
      remaining_capacity: remainingCapacity,
    };
  }

  public async listEvents(options: {
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
    const { items, total } = await this.repo.findPaginated(options);
    const totalPages = Math.ceil(total / options.limit);

    const itemsWithCounts = await Promise.all(
      items.map(async (event) => {
        const registeredCount = await this.repo.countRegistrations(event.id);
        return {
          ...event,
          start_date: event.start_date.toISOString(),
          end_date: event.end_date.toISOString(),
          created_at: event.created_at.toISOString(),
          updated_at: event.updated_at.toISOString(),
          registered_count: registeredCount,
          remaining_capacity: Math.max(0, event.capacity - registeredCount),
        };
      })
    );

    return {
      items: itemsWithCounts,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
      },
    };
  }

  public async updateEvent(
    userId: string,
    isPlatformAdmin: boolean,
    eventId: string,
    dto: UpdateEventDto
  ) {
    const event = await this.repo.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(event.organizer_org_id, userId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organization owners and admins can update this event', 403, 'FORBIDDEN');
      }
    }

    const updates: any = { ...dto };
    if (dto.start_date) updates.start_date = new Date(dto.start_date);
    if (dto.end_date) updates.end_date = new Date(dto.end_date);

    const updated = await this.repo.update(eventId, updates);
    if (!updated) {
      throw new AppError('Failed to update event', 500, 'UPDATE_FAILED');
    }

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'event.updated',
      target_type: 'event',
      target_id: eventId,
      metadata: dto,
    });

    return {
      ...updated,
      start_date: updated.start_date.toISOString(),
      end_date: updated.end_date.toISOString(),
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };
  }

  public async publishEvent(userId: string, isPlatformAdmin: boolean, eventId: string) {
    return this.updateEvent(userId, isPlatformAdmin, eventId, { status: EventStatus.PUBLISHED });
  }

  public async registerForEvent(userId: string, eventId: string) {
    const event = await this.repo.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new AppError('Registration is only allowed for published events', 400, 'EVENT_NOT_PUBLISHED');
    }

    const existing = await this.repo.findRegistration(eventId, userId);
    if (existing) {
      throw new AppError('You are already registered for this event', 400, 'ALREADY_REGISTERED');
    }

    const currentCount = await this.repo.countRegistrations(eventId);
    if (currentCount >= event.capacity) {
      throw new AppError('This event is at full capacity', 400, 'EVENT_CAPACITY_FULL');
    }

    // Generate unique ticket code
    const ticketCode = `TK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create registration record
    const reg = await this.repo.createRegistration({
      event_id: eventId,
      user_id: userId,
      ticket_code: ticketCode,
      status: RegistrationStatus.REGISTERED,
    });

    // Compute cryptographic HMAC signature
    const signature = createTicketSignature(reg.id, eventId, userId, ticketCode);

    // Build payload to encode in the QR code
    const qrPayload = JSON.stringify({
      registrationId: reg.id,
      ticketCode,
      eventId,
      userId,
      signature,
    });

    const qrCodeDataUrl = await generateQrCodeDataUrl(qrPayload);

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'event.registered',
      target_type: 'event',
      target_id: eventId,
      metadata: { registration_id: reg.id, ticket_code: ticketCode },
    });

    return {
      registration: {
        ...reg,
        registered_at: reg.registered_at.toISOString(),
      },
      ticket: {
        ticket_code: ticketCode,
        signature,
        qr_payload: qrPayload,
        qr_code_data_url: qrCodeDataUrl,
      },
    };
  }

  public async checkInAttendee(
    actorUserId: string,
    isPlatformAdmin: boolean,
    eventId: string,
    dto: CheckInDto
  ) {
    const event = await this.repo.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(event.organizer_org_id, actorUserId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organizer admins can check in attendees for this event', 403, 'FORBIDDEN');
      }
    }

    let registration: any = null;

    if (dto.qrPayload) {
      try {
        const parsed = JSON.parse(dto.qrPayload);
        const { registrationId, eventId: payloadEventId, userId, ticketCode, signature } = parsed;

        if (payloadEventId !== eventId) {
          throw new AppError('Ticket QR code is for a different event', 400, 'EVENT_MISMATCH');
        }

        const isValidSig = verifyTicketSignature(registrationId, eventId, userId, ticketCode, signature);
        if (!isValidSig) {
          throw new AppError('Invalid ticket signature: QR code has been tampered with', 400, 'INVALID_TICKET_SIGNATURE');
        }

        registration = await this.repo.findRegistrationById(registrationId);
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('Failed to parse QR payload: invalid format', 400, 'INVALID_QR_PAYLOAD');
      }
    } else if (dto.ticketCode) {
      registration = await this.repo.findRegistrationByTicketCode(dto.ticketCode);
    } else {
      throw new AppError('Either qrPayload or ticketCode must be provided', 400, 'MISSING_PAYLOAD');
    }

    if (!registration || registration.event_id !== eventId) {
      throw new AppError('Registration not found for this event', 404, 'REGISTRATION_NOT_FOUND');
    }

    // Determine target status
    let nextStatus: RegistrationStatus;
    if (dto.targetStatus) {
      nextStatus = dto.targetStatus;
    } else if (registration.status === RegistrationStatus.REGISTERED) {
      nextStatus = RegistrationStatus.CHECKED_IN;
    } else {
      nextStatus = RegistrationStatus.ATTENDED;
    }

    const updatedReg = await this.repo.updateRegistrationStatus(
      registration.id,
      nextStatus,
      nextStatus === RegistrationStatus.CHECKED_IN || nextStatus === RegistrationStatus.ATTENDED
        ? new Date()
        : null
    );

    let certificate: any = null;

    // Auto-generate Certificate on "attended"
    if (nextStatus === RegistrationStatus.ATTENDED) {
      let existingCert = await this.repo.findCertificateByRegistrationId(registration.id);
      if (!existingCert) {
        const verificationId = generateVerificationId();
        existingCert = await this.repo.createCertificate({
          registration_id: registration.id,
          verification_id: verificationId,
        });

        await this.repo.createAuditLog({
          actor_user_id: actorUserId,
          action: 'certificate.issued',
          target_type: 'certificate',
          target_id: existingCert.id,
          metadata: {
            verification_id: verificationId,
            registration_id: registration.id,
            user_id: registration.user_id,
            event_id: eventId,
          },
        });
      }
      certificate = {
        ...existingCert,
        issued_at: existingCert.issued_at.toISOString(),
      };
    }

    await this.repo.createAuditLog({
      actor_user_id: actorUserId,
      action: `event.${nextStatus}`,
      target_type: 'event_registration',
      target_id: registration.id,
      metadata: { previous_status: registration.status, new_status: nextStatus },
    });

    if (!updatedReg) {
      throw new AppError('Failed to update registration status', 500, 'UPDATE_FAILED');
    }

    return {
      registration: {
        id: updatedReg.id,
        event_id: updatedReg.event_id,
        user_id: updatedReg.user_id,
        ticket_code: updatedReg.ticket_code,
        status: updatedReg.status as RegistrationStatus,
        registered_at: updatedReg.registered_at.toISOString(),
        checked_in_at: updatedReg.checked_in_at ? updatedReg.checked_in_at.toISOString() : null,
      },
      certificate,
    };
  }

  public async verifyCertificate(verificationId: string) {
    const cert = await this.repo.findCertificateByVerificationId(verificationId);
    if (!cert) {
      throw new AppError('Certificate verification ID not found or invalid', 404, 'CERTIFICATE_NOT_FOUND');
    }

    const reg = cert.registration;
    const user = reg?.user;
    const event = reg?.event;
    const organizer = event?.organizer;

    return {
      valid: true,
      certificate: {
        verification_id: cert.verification_id,
        issued_at: cert.issued_at.toISOString(),
        attendee_name: user?.name || 'Attendee',
        attendee_email: user?.email || '',
        event_title: event?.title || 'Event',
        event_date: event?.start_date ? event.start_date.toISOString() : '',
        event_location: event?.location || null,
        organizer_name: organizer?.name || 'Organizer',
      },
    };
  }

  public async listEventRegistrations(
    actorUserId: string,
    isPlatformAdmin: boolean,
    eventId: string,
    page = 1,
    limit = 10
  ) {
    const event = await this.repo.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(event.organizer_org_id, actorUserId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organization owners and admins can view attendee lists for this event', 403, 'FORBIDDEN');
      }
    }

    const { items, total } = await this.repo.getEventRegistrations(eventId, page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((r) => ({
        ...r,
        registered_at: r.registered_at.toISOString(),
        checked_in_at: r.checked_in_at ? r.checked_in_at.toISOString() : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getMyRegistrations(userId: string, page = 1, limit = 10) {
    const { items, total } = await this.repo.getUserRegistrations(userId, page, limit);
    const totalPages = Math.ceil(total / limit);

    const itemsWithTickets = await Promise.all(
      items.map(async (r) => {
        const signature = createTicketSignature(r.id, r.event_id, r.user_id, r.ticket_code);
        const qrPayload = JSON.stringify({
          registrationId: r.id,
          ticketCode: r.ticket_code,
          eventId: r.event_id,
          userId: r.user_id,
          signature,
        });
        const qrCodeDataUrl = await generateQrCodeDataUrl(qrPayload);

        return {
          ...r,
          registered_at: r.registered_at.toISOString(),
          checked_in_at: r.checked_in_at ? r.checked_in_at.toISOString() : null,
          ticket: {
            ticket_code: r.ticket_code,
            signature,
            qr_payload: qrPayload,
            qr_code_data_url: qrCodeDataUrl,
          },
        };
      })
    );

    return {
      items: itemsWithTickets,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

export const eventsService = new EventsService();
