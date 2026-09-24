import {
  CreateSponsorshipOpportunityDto,
  ApplySponsorshipDto,
  UpdateSponsorshipApplicationStatusDto,
  SponsorshipStatus,
  RoleType,
} from '@eventops/shared-types';
import {
  SponsorshipRepository,
  sponsorshipRepository,
} from './sponsorship.repository';
import { AppError } from '../../middleware/errorHandler';

export class SponsorshipService {
  constructor(private readonly repo: SponsorshipRepository = sponsorshipRepository) {}

  public async createOpportunity(userId: string, dto: CreateSponsorshipOpportunityDto) {
    const event = await this.repo.findEventById(dto.event_id);
    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(event.organizer_org_id, userId);
      if (!membership) {
        throw new AppError(
          'You must be a member of the event organizer organization to create sponsorship opportunities',
          403,
          'FORBIDDEN'
        );
      }
    }

    const opportunity = await this.repo.createOpportunity({
      event_id: dto.event_id,
      title: dto.title,
      needs: dto.needs || {},
      budget_range: dto.budget_range || null,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'sponsorship.opportunity.created',
      target_type: 'sponsorship_opportunity',
      target_id: opportunity.id,
      metadata: {
        event_id: dto.event_id,
        title: dto.title,
        budget_range: dto.budget_range,
      },
    });

    return opportunity;
  }

  public async getOpportunityById(id: string) {
    const opp = await this.repo.findOpportunityById(id);
    if (!opp) {
      throw new AppError('Sponsorship opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
    }
    return opp;
  }

  public async listOpportunities(options: {
    event_id?: string;
    search?: string;
    budget_range?: string;
    page: number;
    limit: number;
  }) {
    const { items, total } = await this.repo.findOpportunitiesPaginated(options);
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

  public async applyToOpportunity(
    userId: string,
    opportunityId: string,
    dto: ApplySponsorshipDto
  ) {
    const opportunity = await this.repo.findOpportunityById(opportunityId);
    if (!opportunity) {
      throw new AppError('Sponsorship opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
    }

    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(dto.sponsor_org_id, userId);
      const hasSponsorRole = roles.some(
        (r: any) => r.role_type === RoleType.SPONSOR && (!r.org_id || r.org_id === dto.sponsor_org_id)
      );

      if (!membership && !hasSponsorRole) {
        throw new AppError(
          'You must be an authorized member or sponsor of the applying organization',
          403,
          'FORBIDDEN'
        );
      }
    }

    // Check duplicate application
    const existing = await this.repo.findExistingApplication(opportunityId, dto.sponsor_org_id);
    if (existing) {
      throw new AppError(
        'An application from this organization already exists for this opportunity',
        400,
        'DUPLICATE_APPLICATION'
      );
    }

    const application = await this.repo.createApplication({
      opportunity_id: opportunityId,
      sponsor_org_id: dto.sponsor_org_id,
      status: SponsorshipStatus.POTENTIAL,
      notes: dto.notes || null,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'sponsorship.application.created',
      target_type: 'sponsorship_application',
      target_id: application.id,
      metadata: {
        opportunity_id: opportunityId,
        sponsor_org_id: dto.sponsor_org_id,
      },
    });

    return application;
  }

  public async listApplications(
    userId: string,
    options: {
      opportunity_id?: string;
      sponsor_org_id?: string;
      status?: SponsorshipStatus;
      page: number;
      limit: number;
    }
  ) {
    const { items, total } = await this.repo.findApplicationsPaginated(options);
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

  public async updateApplicationStatus(
    userId: string,
    applicationId: string,
    dto: UpdateSponsorshipApplicationStatusDto
  ) {
    const application = await this.repo.findApplicationById(applicationId);
    if (!application) {
      throw new AppError('Sponsorship application not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const validStatuses = Object.values(SponsorshipStatus);
    if (!validStatuses.includes(dto.status)) {
      throw new AppError(
        `Invalid status. Valid pipeline statuses: ${validStatuses.join(', ')}`,
        400,
        'INVALID_STATUS'
      );
    }

    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    if (!isPlatformAdmin) {
      const organizerOrgId = (application.opportunity as any)?.event?.organizer_org_id;
      const isOrganizerMember = organizerOrgId
        ? await this.repo.findOrgMember(organizerOrgId, userId)
        : null;

      const isSponsorMember = await this.repo.findOrgMember(application.sponsor_org_id, userId);

      // Organizer admin can transition to any status; sponsor org can also participate in negotiation
      if (!isOrganizerMember && !isSponsorMember) {
        throw new AppError(
          'You are not authorized to update this sponsorship application status',
          403,
          'FORBIDDEN'
        );
      }
    }

    const previousStatus = application.status;
    const updated = await this.repo.updateApplication(applicationId, {
      status: dto.status,
      notes: dto.notes !== undefined ? dto.notes : application.notes,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'sponsorship.application.status_updated',
      target_type: 'sponsorship_application',
      target_id: applicationId,
      metadata: {
        previous_status: previousStatus,
        new_status: dto.status,
        notes: dto.notes,
      },
    });

    return updated;
  }
}

export const sponsorshipService = new SponsorshipService();
