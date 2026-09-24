import { RoleType, UpdateProfileDto, AssignRoleDto } from '@eventops/shared-types';
import { UsersRepository, usersRepository } from './users.repository';
import { AppError } from '../../middleware/errorHandler';

export class UsersService {
  constructor(private readonly repo: UsersRepository = usersRepository) {}

  public async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        interests: user.interests,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
      },
      roles: user.roles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role_type: r.role_type,
        org_id: r.org_id,
        created_at: r.created_at.toISOString(),
      })),
    };
  }

  public async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.repo.findById(userId);
    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updated = await this.repo.updateProfile(userId, {
      name: dto.name,
      interests: dto.interests,
      avatar_url: dto.avatar_url,
    });

    if (!updated) {
      throw new AppError('Failed to update profile', 500, 'UPDATE_FAILED');
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      interests: updated.interests,
      avatar_url: updated.avatar_url,
      created_at: updated.created_at.toISOString(),
    };
  }

  public async assignRole(userId: string, dto: AssignRoleDto) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if role is already assigned to this user (for the same org if scoped)
    const alreadyHasRole = user.roles.some(
      (r) => r.role_type === dto.role_type && (r.org_id || null) === (dto.org_id || null)
    );

    if (alreadyHasRole) {
      throw new AppError(
        `User already holds role '${dto.role_type}'${dto.org_id ? ` for organization ${dto.org_id}` : ''}`,
        400,
        'ROLE_ALREADY_ASSIGNED'
      );
    }

    const role = await this.repo.assignRole({
      user_id: userId,
      role_type: dto.role_type,
      org_id: dto.org_id,
    });

    return {
      id: role.id,
      user_id: role.user_id,
      role_type: role.role_type as RoleType,
      org_id: role.org_id,
      created_at: role.created_at.toISOString(),
    };
  }

  public async listUsers(page = 1, limit = 10) {
    const { users, total } = await this.repo.findPaginated(page, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        interests: u.interests,
        avatar_url: u.avatar_url,
        roles: u.roles.map((r) => r.role_type),
        created_at: u.created_at.toISOString(),
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

export const usersService = new UsersService();
