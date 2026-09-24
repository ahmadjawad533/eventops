import {
  CreateVenueDto,
  CreateVenueRequestDto,
  RespondVenueRequestDto,
  VenueRequestStatus,
  RoleType,
} from '@eventops/shared-types';
import { VenuesRepository, venuesRepository } from './venues.repository';
import { AppError } from '../../middleware/errorHandler';

export class VenuesService {
  constructor(private readonly repo: VenuesRepository = venuesRepository) {}

  public async createVenue(userId: string, dto: CreateVenueDto) {
    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(dto.owner_org_id, userId);
      const isVenueOwner = roles.some(
        (r: any) => r.role_type === RoleType.VENUE_OWNER && (!r.org_id || r.org_id === dto.owner_org_id)
      );

      if (!membership && !isVenueOwner) {
        throw new AppError(
          'You must be a member or venue owner for this organization to create venues',
          403,
          'FORBIDDEN'
        );
      }
    }

    const venue = await this.repo.createVenue({
      owner_org_id: dto.owner_org_id,
      name: dto.name,
      capacity: dto.capacity,
      facilities: dto.facilities || {},
      city: dto.city,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'venue.created',
      target_type: 'venue',
      target_id: venue.id,
      metadata: {
        name: dto.name,
        city: dto.city,
        capacity: dto.capacity,
        owner_org_id: dto.owner_org_id,
      },
    });

    return venue;
  }

  public async getVenueById(id: string) {
    const venue = await this.repo.findVenueById(id);
    if (!venue) {
      throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');
    }
    return venue;
  }

  public async listVenues(options: {
    city?: string;
    min_capacity?: number;
    max_capacity?: number;
    facility?: string;
    owner_org_id?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { items, total } = await this.repo.findVenuesPaginated(options);
    const totalPages = Math.ceil(total / options.limit);

    return {
      items,
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

  public async createBookingRequest(
    userId: string,
    venueId: string,
    dto: CreateVenueRequestDto
  ) {
    const venue = await this.repo.findVenueById(venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');
    }

    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(dto.requesting_org_id, userId);
      if (!membership) {
        throw new AppError(
          'You must be a member of the requesting organization to submit a venue booking',
          403,
          'FORBIDDEN'
        );
      }
    }

    const request = await this.repo.createBookingRequest({
      venue_id: venueId,
      event_id: dto.event_id,
      requesting_org_id: dto.requesting_org_id,
      status: VenueRequestStatus.REQUESTED,
      notes: dto.notes || null,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'venue.request.created',
      target_type: 'venue_request',
      target_id: request.id,
      metadata: {
        venue_id: venueId,
        event_id: dto.event_id,
        requesting_org_id: dto.requesting_org_id,
      },
    });

    return request;
  }

  public async listBookingRequests(
    userId: string,
    options: {
      venue_id?: string;
      event_id?: string;
      requesting_org_id?: string;
      owner_org_id?: string;
      status?: VenueRequestStatus;
      page: number;
      limit: number;
    }
  ) {
    const { items, total } = await this.repo.findBookingRequestsPaginated(options);
    const totalPages = Math.ceil(total / options.limit);

    return {
      items,
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

  public async respondToBookingRequest(
    userId: string,
    requestId: string,
    dto: RespondVenueRequestDto
  ) {
    const request = await this.repo.findBookingRequestById(requestId);
    if (!request) {
      throw new AppError('Venue request not found', 404, 'REQUEST_NOT_FOUND');
    }

    const venue = (request as any).venue;
    const ownerOrgId = venue?.owner_org_id;

    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const isOwnerMember = ownerOrgId
        ? await this.repo.findOrgMember(ownerOrgId, userId)
        : null;

      if (!isOwnerMember) {
        throw new AppError(
          'Only the venue owner organization can respond to this booking request',
          403,
          'FORBIDDEN'
        );
      }
    }

    let nextStatus: VenueRequestStatus;
    if (dto.action === 'accept') {
      nextStatus = VenueRequestStatus.ACCEPTED;
    } else if (dto.action === 'reject') {
      nextStatus = VenueRequestStatus.REJECTED;
    } else if (dto.action === 'counter') {
      nextStatus = VenueRequestStatus.COUNTERED;
    } else {
      throw new AppError(
        'Invalid action. Valid actions are: accept, reject, counter',
        400,
        'INVALID_ACTION'
      );
    }

    const updated = await this.repo.updateBookingRequest(requestId, {
      status: nextStatus,
      notes: dto.notes || (request as any).notes,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: `venue.request.${dto.action}`,
      target_type: 'venue_request',
      target_id: requestId,
      metadata: {
        action: dto.action,
        status: nextStatus,
        notes: dto.notes,
      },
    });

    return updated;
  }
}

export const venuesService = new VenuesService();
