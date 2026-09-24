import { OrganizationType } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb } from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class CommunitiesRepository {
  public async findCommunityById(id: string) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id },
      });
      if (org && org.type === OrganizationType.COMMUNITY) {
        return org;
      }
      return null;
    } catch (error) {
      const org = memoryDb.findOrganizationById(id);
      if (org && org.type === OrganizationType.COMMUNITY) {
        return org;
      }
      return null;
    }
  }

  public async findCommunities(options: { search?: string; page: number; limit: number }) {
    const { search, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = { type: OrganizationType.COMMUNITY };
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
      return memoryDb.findOrganizations({
        type: OrganizationType.COMMUNITY,
        search,
        skip,
        take: limit,
      });
    }
  }

  public async addFollower(community_org_id: string, user_id: string) {
    try {
      return await prisma.communityFollower.create({
        data: {
          community_org_id,
          user_id,
        },
      });
    } catch (error) {
      return memoryDb.addFollower(community_org_id, user_id);
    }
  }

  public async findFollower(community_org_id: string, user_id: string) {
    try {
      return await prisma.communityFollower.findUnique({
        where: {
          community_org_id_user_id: { community_org_id, user_id },
        },
      });
    } catch (error) {
      return memoryDb.findFollower(community_org_id, user_id);
    }
  }

  public async removeFollower(community_org_id: string, user_id: string) {
    try {
      await prisma.communityFollower.delete({
        where: {
          community_org_id_user_id: { community_org_id, user_id },
        },
      });
      return true;
    } catch (error) {
      return memoryDb.removeFollower(community_org_id, user_id);
    }
  }

  public async getFollowerCount(community_org_id: string): Promise<number> {
    try {
      return await prisma.communityFollower.count({
        where: { community_org_id },
      });
    } catch (error) {
      return memoryDb.getFollowerCount(community_org_id);
    }
  }

  public async getFollowers(community_org_id: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [followers, total] = await Promise.all([
        prisma.communityFollower.findMany({
          where: { community_org_id },
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
          orderBy: { followed_at: 'desc' },
        }),
        prisma.communityFollower.count({ where: { community_org_id } }),
      ]);

      return {
        items: followers.map((f) => ({
          id: f.id,
          community_org_id: f.community_org_id,
          user_id: f.user_id,
          followed_at: f.followed_at,
          user: f.user,
        })),
        total,
      };
    } catch (error) {
      const result = memoryDb.getFollowers(community_org_id, skip, limit);
      const items = result.items.map((f) => {
        const u = memoryDb.findUserById(f.user_id);
        return {
          ...f,
          user: u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url } : undefined,
        };
      });
      return { items, total: result.total };
    }
  }

  public async isCommunityAdmin(community_org_id: string, user_id: string): Promise<boolean> {
    try {
      const role = await prisma.role.findFirst({
        where: {
          user_id,
          org_id: community_org_id,
          role_type: 'community_admin',
        },
      });
      return Boolean(role);
    } catch (error) {
      const roles = memoryDb.getUserRoles(user_id);
      return roles.some((r) => r.role_type === 'community_admin' && r.org_id === community_org_id);
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

export const communitiesRepository = new CommunitiesRepository();
