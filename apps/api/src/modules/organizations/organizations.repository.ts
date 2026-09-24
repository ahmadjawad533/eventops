import { OrganizationType, OrgMemberRole, RoleType } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb } from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class OrganizationsRepository {
  public async create(data: {
    name: string;
    type: OrganizationType;
    description?: string | null;
    website?: string | null;
    verified?: boolean;
  }) {
    try {
      return await prisma.organization.create({
        data: {
          name: data.name,
          type: data.type as any,
          description: data.description || null,
          website: data.website || null,
          verified: data.verified || false,
        },
      });
    } catch (error) {
      logger.debug('Prisma create org failed, using memory store');
      return memoryDb.createOrganization(data);
    }
  }

  public async findById(id: string) {
    try {
      return await prisma.organization.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.debug('Prisma findById org failed, using memory store');
      return memoryDb.findOrganizationById(id);
    }
  }

  public async update(
    id: string,
    updates: {
      name?: string;
      description?: string | null;
      website?: string | null;
      verified?: boolean;
    }
  ) {
    try {
      return await prisma.organization.update({
        where: { id },
        data: updates,
      });
    } catch (error) {
      logger.debug('Prisma update org failed, using memory store');
      return memoryDb.updateOrganization(id, updates);
    }
  }

  public async findPaginated(options: {
    type?: OrganizationType;
    verified?: boolean;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { type, verified, search, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (type) where.type = type;
      if (verified !== undefined) where.verified = verified;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.organization.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findPaginated orgs failed, using memory store');
      return memoryDb.findOrganizations({
        type,
        verified,
        search,
        skip,
        take: limit,
      });
    }
  }

  public async addMember(data: {
    org_id: string;
    user_id: string;
    role_in_org?: OrgMemberRole;
  }) {
    try {
      return await prisma.organizationMember.create({
        data: {
          org_id: data.org_id,
          user_id: data.user_id,
          role_in_org: (data.role_in_org || OrgMemberRole.MEMBER) as any,
        },
      });
    } catch (error) {
      logger.debug('Prisma addMember failed, using memory store');
      return memoryDb.addMember(data);
    }
  }

  public async findMember(org_id: string, user_id: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: {
          org_id_user_id: { org_id, user_id },
        },
      });
    } catch (error) {
      return memoryDb.findMember(org_id, user_id);
    }
  }

  public async updateMemberRole(org_id: string, user_id: string, role_in_org: OrgMemberRole) {
    try {
      return await prisma.organizationMember.update({
        where: {
          org_id_user_id: { org_id, user_id },
        },
        data: { role_in_org: role_in_org as any },
      });
    } catch (error) {
      return memoryDb.updateMemberRole(org_id, user_id, role_in_org);
    }
  }

  public async removeMember(org_id: string, user_id: string) {
    try {
      await prisma.organizationMember.delete({
        where: {
          org_id_user_id: { org_id, user_id },
        },
      });
      return true;
    } catch (error) {
      return memoryDb.removeMember(org_id, user_id);
    }
  }

  public async getMembers(org_id: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [members, total] = await Promise.all([
        prisma.organizationMember.findMany({
          where: { org_id },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar_url: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        }),
        prisma.organizationMember.count({ where: { org_id } }),
      ]);

      return {
        items: members.map((m) => ({
          id: m.id,
          org_id: m.org_id,
          user_id: m.user_id,
          role_in_org: m.role_in_org as unknown as OrgMemberRole,
          joined_at: m.joined_at,
          user: m.user,
        })),
        total,
      };
    } catch (error) {
      const result = memoryDb.getMembers(org_id, skip, limit);
      const items = result.items.map((m) => {
        const u = memoryDb.findUserById(m.user_id);
        return {
          ...m,
          user: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url } : undefined,
        };
      });
      return { items, total: result.total };
    }
  }

  public async getMemberCount(org_id: string): Promise<number> {
    try {
      return await prisma.organizationMember.count({ where: { org_id } });
    } catch (error) {
      return memoryDb.getMemberCount(org_id);
    }
  }

  public async getFollowerCount(community_org_id: string): Promise<number> {
    try {
      return await prisma.communityFollower.count({ where: { community_org_id } });
    } catch (error) {
      return memoryDb.getFollowerCount(community_org_id);
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

  public async assignUserRole(data: {
    user_id: string;
    role_type: RoleType;
    org_id?: string | null;
  }) {
    try {
      return await prisma.role.create({
        data: {
          user_id: data.user_id,
          role_type: data.role_type as any,
          org_id: data.org_id || null,
        },
      });
    } catch (error) {
      return memoryDb.createRole(data);
    }
  }
}

export const organizationsRepository = new OrganizationsRepository();
