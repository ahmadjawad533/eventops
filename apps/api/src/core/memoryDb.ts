import crypto from 'crypto';
import { RoleType } from '@eventops/shared-types';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  interests: string[];
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbRole {
  id: string;
  user_id: string;
  org_id?: string | null;
  role_type: RoleType;
  created_at: Date;
}

class MemoryDatabase {
  public users: Map<string, DbUser> = new Map();
  public roles: Map<string, DbRole> = new Map();

  public clear() {
    this.users.clear();
    this.roles.clear();
  }

  public createUser(data: {
    email: string;
    password_hash: string;
    name: string;
    interests?: string[];
    avatar_url?: string | null;
  }): DbUser {
    const id = crypto.randomUUID();
    const now = new Date();
    const user: DbUser = {
      id,
      email: data.email.toLowerCase(),
      password_hash: data.password_hash,
      name: data.name,
      interests: data.interests || [],
      avatar_url: data.avatar_url || null,
      created_at: now,
      updated_at: now,
    };
    this.users.set(id, user);
    return user;
  }

  public findUserByEmail(email: string): DbUser | null {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public findUserById(id: string): DbUser | null {
    return this.users.get(id) || null;
  }

  public updateUser(id: string, updates: Partial<DbUser>): DbUser | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: DbUser = {
      ...user,
      ...updates,
      updated_at: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  public createRole(data: { user_id: string; role_type: RoleType; org_id?: string | null }): DbRole {
    const id = crypto.randomUUID();
    const role: DbRole = {
      id,
      user_id: data.user_id,
      org_id: data.org_id || null,
      role_type: data.role_type,
      created_at: new Date(),
    };
    this.roles.set(id, role);
    return role;
  }

  public getUserRoles(userId: string): DbRole[] {
    const list: DbRole[] = [];
    for (const role of this.roles.values()) {
      if (role.user_id === userId) {
        list.push(role);
      }
    }
    return list;
  }
}

export const memoryDb = new MemoryDatabase();
