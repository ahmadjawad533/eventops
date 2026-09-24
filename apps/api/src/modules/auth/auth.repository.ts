import { RoleType } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb } from '../../core/memoryDb';
import { logger } from '../../core/logger';

export interface UserWithRoles {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  interests: string[];
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
  roles: {
    id: string;
    user_id: string;
    org_id?: string | null;
    role_type: RoleType;
    created_at: Date;
  }[];
}

export class AuthRepository {
  public async findByEmail(email: string): Promise<UserWithRoles | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
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
      logger.debug('Prisma findByEmail failed, using memory store', { email });
      const user = memoryDb.findUserByEmail(email);
      if (!user) return null;
      const roles = memoryDb.getUserRoles(user.id);
      return { ...user, roles };
    }
  }

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

  public async createUser(data: {
    email: string;
    password_hash: string;
    name: string;
    interests?: string[];
    avatar_url?: string | null;
  }) {
    try {
      return await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          password_hash: data.password_hash,
          name: data.name,
          interests: data.interests || [],
          avatar_url: data.avatar_url || null,
        },
      });
    } catch (error) {
      logger.debug('Prisma createUser failed, using memory store', { email: data.email });
      return memoryDb.createUser(data);
    }
  }

  public async createRole(data: {
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
      logger.debug('Prisma createRole failed, using memory store', { userId: data.user_id });
      return memoryDb.createRole(data);
    }
  }

  public async getUserRoles(userId: string) {
    try {
      const roles = await prisma.role.findMany({
        where: { user_id: userId },
      });
      return roles.map((r) => ({
        ...r,
        role_type: r.role_type as unknown as RoleType,
      }));
    } catch (error) {
      return memoryDb.getUserRoles(userId);
    }
  }
}

export const authRepository = new AuthRepository();
