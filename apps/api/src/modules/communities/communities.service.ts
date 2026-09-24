import { CommunitiesRepository, communitiesRepository } from './communities.repository';
import { AppError } from '../../middleware/errorHandler';

export class CommunitiesService {
  constructor(private readonly repo: CommunitiesRepository = communitiesRepository) {}

  public async listCommunities(search?: string, page = 1, limit = 10) {
    const { items, total } = await this.repo.findCommunities({ search, page, limit });
    const totalPages = Math.ceil(total / limit);

    const itemsWithCounts = await Promise.all(
      items.map(async (comm) => {
        const followerCount = await this.repo.getFollowerCount(comm.id);
        return {
          ...comm,
          follower_count: followerCount,
          created_at: comm.created_at.toISOString(),
          updated_at: comm.updated_at.toISOString(),
        };
      })
    );

    return {
      items: itemsWithCounts,
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

  public async followCommunity(userId: string, communityOrgId: string) {
    const community = await this.repo.findCommunityById(communityOrgId);
    if (!community) {
      throw new AppError('Community not found', 404, 'COMMUNITY_NOT_FOUND');
    }

    const existing = await this.repo.findFollower(communityOrgId, userId);
    if (existing) {
      throw new AppError('You are already following this community', 400, 'ALREADY_FOLLOWING');
    }

    const follower = await this.repo.addFollower(communityOrgId, userId);

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'community.followed',
      target_type: 'community',
      target_id: communityOrgId,
    });

    return {
      ...follower,
      followed_at: follower.followed_at.toISOString(),
    };
  }

  public async unfollowCommunity(userId: string, communityOrgId: string) {
    const follower = await this.repo.findFollower(communityOrgId, userId);
    if (!follower) {
      throw new AppError('You are not following this community', 400, 'NOT_FOLLOWING');
    }

    await this.repo.removeFollower(communityOrgId, userId);

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'community.unfollowed',
      target_type: 'community',
      target_id: communityOrgId,
    });

    return { success: true, message: 'Successfully unfollowed community' };
  }

  public async getFollowerCount(communityOrgId: string) {
    const community = await this.repo.findCommunityById(communityOrgId);
    if (!community) {
      throw new AppError('Community not found', 404, 'COMMUNITY_NOT_FOUND');
    }

    const count = await this.repo.getFollowerCount(communityOrgId);
    return { community_id: communityOrgId, follower_count: count };
  }

  public async getFollowers(
    actorUserId: string,
    isPlatformAdmin: boolean,
    communityOrgId: string,
    page = 1,
    limit = 10
  ) {
    const community = await this.repo.findCommunityById(communityOrgId);
    if (!community) {
      throw new AppError('Community not found', 404, 'COMMUNITY_NOT_FOUND');
    }

    // PRIVACY ENFORCEMENT: Only community admins of this org or platform admins can inspect follower list
    if (!isPlatformAdmin) {
      const isAdmin = await this.repo.isCommunityAdmin(communityOrgId, actorUserId);
      if (!isAdmin) {
        throw new AppError(
          'Privacy violation: Only admins of this community can view member and follower identities.',
          403,
          'FORBIDDEN'
        );
      }
    }

    const { items, total } = await this.repo.getFollowers(communityOrgId, page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((f) => ({
        ...f,
        followed_at: f.followed_at instanceof Date ? f.followed_at.toISOString() : f.followed_at,
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
}

export const communitiesService = new CommunitiesService();
