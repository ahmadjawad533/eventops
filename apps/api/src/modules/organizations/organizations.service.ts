import {
  OrganizationType,
  OrgMemberRole,
  RoleType,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  VerifyOrganizationDto,
} from '@eventops/shared-types';
import {
  OrganizationsRepository,
  organizationsRepository,
} from './organizations.repository';
import { AppError } from '../../middleware/errorHandler';

export class OrganizationsService {
  constructor(private readonly repo: OrganizationsRepository = organizationsRepository) {}

  public async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const org = await this.repo.create({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      website: dto.website,
      verified: false,
    });

    // Creator is the OWNER
    await this.repo.addMember({
      org_id: org.id,
      user_id: userId,
      role_in_org: OrgMemberRole.OWNER,
    });

    // Assign appropriate role to creator
    if (dto.type === OrganizationType.COMMUNITY) {
      await this.repo.assignUserRole({
        user_id: userId,
        role_type: RoleType.COMMUNITY_ADMIN,
        org_id: org.id,
      });
    } else {
      await this.repo.assignUserRole({
        user_id: userId,
        role_type: RoleType.ORGANIZER,
        org_id: org.id,
      });
    }

    // Write to AuditLog
    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'organization.created',
      target_type: 'organization',
      target_id: org.id,
      metadata: { name: org.name, type: org.type },
    });

    return {
      ...org,
      created_at: org.created_at.toISOString(),
      updated_at: org.updated_at.toISOString(),
    };
  }

  public async getOrganizationById(id: string) {
    const org = await this.repo.findById(id);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const [memberCount, followerCount] = await Promise.all([
      this.repo.getMemberCount(id),
      this.repo.getFollowerCount(id),
    ]);

    return {
      ...org,
      member_count: memberCount,
      follower_count: followerCount,
      created_at: org.created_at.toISOString(),
      updated_at: org.updated_at.toISOString(),
    };
  }

  public async listOrganizations(options: {
    type?: OrganizationType;
    verified?: boolean;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { items, total } = await this.repo.findPaginated(options);
    const totalPages = Math.ceil(total / options.limit);

    // Fetch counts for each organization
    const itemsWithCounts = await Promise.all(
      items.map(async (org) => {
        const [memberCount, followerCount] = await Promise.all([
          this.repo.getMemberCount(org.id),
          this.repo.getFollowerCount(org.id),
        ]);
        return {
          ...org,
          member_count: memberCount,
          follower_count: followerCount,
          created_at: org.created_at.toISOString(),
          updated_at: org.updated_at.toISOString(),
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

  public async updateOrganization(
    userId: string,
    orgId: string,
    isPlatformAdmin: boolean,
    dto: UpdateOrganizationDto
  ) {
    const org = await this.repo.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findMember(orgId, userId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organization owners and admins can update this organization', 403, 'FORBIDDEN');
      }
    }

    const updated = await this.repo.update(orgId, dto);
    if (!updated) {
      throw new AppError('Failed to update organization', 500, 'UPDATE_FAILED');
    }

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'organization.updated',
      target_type: 'organization',
      target_id: orgId,
      metadata: dto,
    });

    return {
      ...updated,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };
  }

  public async verifyOrganization(
    adminUserId: string,
    orgId: string,
    dto: VerifyOrganizationDto
  ) {
    const org = await this.repo.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const updated = await this.repo.update(orgId, { verified: dto.verified });
    if (!updated) {
      throw new AppError('Failed to update verification status', 500, 'UPDATE_FAILED');
    }

    await this.repo.createAuditLog({
      actor_user_id: adminUserId,
      action: 'organization.verified_toggled',
      target_type: 'organization',
      target_id: orgId,
      metadata: { previous: org.verified, new: dto.verified },
    });

    return {
      ...updated,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };
  }

  public async joinOrganization(userId: string, orgId: string) {
    const org = await this.repo.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const existing = await this.repo.findMember(orgId, userId);
    if (existing) {
      throw new AppError('You are already a member of this organization', 400, 'ALREADY_MEMBER');
    }

    const member = await this.repo.addMember({
      org_id: orgId,
      user_id: userId,
      role_in_org: OrgMemberRole.MEMBER,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'organization.member_joined',
      target_type: 'organization',
      target_id: orgId,
    });

    return {
      ...member,
      joined_at: member.joined_at.toISOString(),
    };
  }

  public async leaveOrganization(userId: string, orgId: string) {
    const membership = await this.repo.findMember(orgId, userId);
    if (!membership) {
      throw new AppError('You are not a member of this organization', 400, 'NOT_A_MEMBER');
    }

    if (membership.role_in_org === OrgMemberRole.OWNER) {
      throw new AppError('The organization owner cannot leave without transferring ownership', 400, 'OWNER_CANNOT_LEAVE');
    }

    await this.repo.removeMember(orgId, userId);

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'organization.member_left',
      target_type: 'organization',
      target_id: orgId,
    });

    return { success: true, message: 'Successfully left organization' };
  }

  public async listMembers(orgId: string, page = 1, limit = 10) {
    const org = await this.repo.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const { items, total } = await this.repo.getMembers(orgId, page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((m) => ({
        ...m,
        joined_at: m.joined_at instanceof Date ? m.joined_at.toISOString() : m.joined_at,
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

  public async assignCommunityAdmin(
    actorUserId: string,
    isPlatformAdmin: boolean,
    orgId: string,
    targetUserId: string
  ) {
    const org = await this.repo.findById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findMember(orgId, actorUserId);
      if (!membership || (membership.role_in_org !== OrgMemberRole.OWNER && membership.role_in_org !== OrgMemberRole.ADMIN)) {
        throw new AppError('Only organization owners and admins can assign community admins', 403, 'FORBIDDEN');
      }
    }

    // Ensure target user is a member
    let targetMember = await this.repo.findMember(orgId, targetUserId);
    if (!targetMember) {
      targetMember = await this.repo.addMember({
        org_id: orgId,
        user_id: targetUserId,
        role_in_org: OrgMemberRole.ADMIN,
      });
    } else {
      await this.repo.updateMemberRole(orgId, targetUserId, OrgMemberRole.ADMIN);
    }

    // Assign RoleType.COMMUNITY_ADMIN
    await this.repo.assignUserRole({
      user_id: targetUserId,
      role_type: RoleType.COMMUNITY_ADMIN,
      org_id: orgId,
    });

    await this.repo.createAuditLog({
      actor_user_id: actorUserId,
      action: 'organization.community_admin_assigned',
      target_type: 'organization',
      target_id: orgId,
      metadata: { target_user_id: targetUserId },
    });

    return {
      success: true,
      message: 'Community admin role assigned successfully',
      target_user_id: targetUserId,
      org_id: orgId,
    };
  }
}

export const organizationsService = new OrganizationsService();
