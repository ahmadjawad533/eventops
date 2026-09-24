import { RoleType } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb } from '../../core/memoryDb';
import { logger } from '../../core/logger';
import { UserWithRoles } from '../auth/auth.repository';

export class UsersRepository {
  public async findById(id: string): Promise<UserWithRoles | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { roles: true },
      });
      if (user) {
        return {
          ...user,
          roles: user.roles.map((r) => ({
            ...r,
            role_type: r.role_type as unknown as RoleType,
          })),
        };
      }
      return null;
    } catch (error) {
      logger.debug('Prisma findById failed, using memory store', { id });
      const user = memoryDb.findUserById(id);
      if (!user) return null;
      const roles = memoryDb.getUserRoles(user.id);
      return { ...user, roles };
    }
  }

  public async updateProfile(
    id: string,
    data: { name?: string; interests?: string[]; avatar_url?: string | null }
  ): Promise<UserWithRoles | null> {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          interests: data.interests,
          avatar_url: data.avatar_url,
        },
        include: { roles: true },
      });
      return {
        ...updated,
        roles: updated.roles.map((r) => ({
          ...r,
          role_type: r.role_type as unknown as RoleType,
        })),
      };
    } catch (error) {
      logger.debug('Prisma updateProfile failed, using memory store', { id });
      const updated = memoryDb.updateUser(id, data);
      if (!updated) return null;
      const roles = memoryDb.getUserRoles(id);
      return { ...updated, roles };
    }
  }

  public async assignRole(data: {
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
      logger.debug('Prisma assignRole failed, using memory store', { userId: data.user_id });
      return memoryDb.createRole(data);
    }
  }

  public async findPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: { roles: true },
        }),
        prisma.user.count(),
      ]);

      return {
        users: users.map((u) => ({
          ...u,
          roles: u.roles.map((r) => ({
            ...r,
            role_type: r.role_type as unknown as RoleType,
          })),
        })),
        total,
      };
    } catch (error) {
      logger.debug('Prisma findPaginated failed, using memory store');
      const allUsers = Array.from(memoryDb.users.values()).sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime()
      );
      const total = allUsers.length;
      const paged = allUsers.slice(skip, skip + limit);
      const users = paged.map((u) => ({
        ...u,
        roles: memoryDb.getUserRoles(u.id),
      }));

      return { users, total };
    }
  }
}

export const usersRepository = new UsersRepository();
