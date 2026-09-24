import crypto from 'crypto';
import { RoleType, OrganizationType, OrgMemberRole } from '@eventops/shared-types';

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

export interface DbOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  verified: boolean;
  description?: string | null;
  website?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbOrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role_in_org: OrgMemberRole;
  joined_at: Date;
}

export interface DbCommunityFollower {
  id: string;
  community_org_id: string;
  user_id: string;
  followed_at: Date;
}

export interface DbAuditLog {
  id: string;
  actor_user_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  created_at: Date;
}

class MemoryDatabase {
  public users: Map<string, DbUser> = new Map();
  public roles: Map<string, DbRole> = new Map();
  public organizations: Map<string, DbOrganization> = new Map();
  public members: Map<string, DbOrgMember> = new Map();
  public followers: Map<string, DbCommunityFollower> = new Map();
  public auditLogs: DbAuditLog[] = [];

  public clear() {
    this.users.clear();
    this.roles.clear();
    this.organizations.clear();
    this.members.clear();
    this.followers.clear();
    this.auditLogs = [];
  }

  // --- Users ---
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

  // --- Roles ---
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

  // --- Organizations ---
  public createOrganization(data: {
    name: string;
    type: OrganizationType;
    description?: string | null;
    website?: string | null;
    verified?: boolean;
  }): DbOrganization {
    const id = crypto.randomUUID();
    const now = new Date();
    const org: DbOrganization = {
      id,
      name: data.name,
      type: data.type,
      verified: data.verified || false,
      description: data.description || null,
      website: data.website || null,
      created_at: now,
      updated_at: now,
    };
    this.organizations.set(id, org);
    return org;
  }

  public findOrganizationById(id: string): DbOrganization | null {
    return this.organizations.get(id) || null;
  }

  public updateOrganization(id: string, updates: Partial<DbOrganization>): DbOrganization | null {
    const org = this.organizations.get(id);
    if (!org) return null;
    const updated: DbOrganization = {
      ...org,
      ...updates,
      updated_at: new Date(),
    };
    this.organizations.set(id, updated);
    return updated;
  }

  public findOrganizations(filter?: {
    type?: OrganizationType;
    verified?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    let list = Array.from(this.organizations.values());

    if (filter?.type) {
      list = list.filter((o) => o.type === filter.type);
    }
    if (filter?.verified !== undefined) {
      list = list.filter((o) => o.verified === filter.verified);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    const total = list.length;
    const skip = filter?.skip || 0;
    const take = filter?.take || 10;
    return {
      items: list.slice(skip, skip + take),
      total,
    };
  }

  // --- Organization Members ---
  public addMember(data: {
    org_id: string;
    user_id: string;
    role_in_org?: OrgMemberRole;
  }): DbOrgMember {
    const id = crypto.randomUUID();
    const member: DbOrgMember = {
      id,
      org_id: data.org_id,
      user_id: data.user_id,
      role_in_org: data.role_in_org || OrgMemberRole.MEMBER,
      joined_at: new Date(),
    };
    this.members.set(`${data.org_id}_${data.user_id}`, member);
    return member;
  }

  public findMember(org_id: string, user_id: string): DbOrgMember | null {
    return this.members.get(`${org_id}_${user_id}`) || null;
  }

  public updateMemberRole(org_id: string, user_id: string, role_in_org: OrgMemberRole): DbOrgMember | null {
    const member = this.findMember(org_id, user_id);
    if (!member) return null;
    member.role_in_org = role_in_org;
    this.members.set(`${org_id}_${user_id}`, member);
    return member;
  }

  public removeMember(org_id: string, user_id: string): boolean {
    return this.members.delete(`${org_id}_${user_id}`);
  }

  public getMembers(org_id: string, skip = 0, take = 10) {
    const list: DbOrgMember[] = [];
    for (const m of this.members.values()) {
      if (m.org_id === org_id) {
        list.push(m);
      }
    }
    list.sort((a, b) => a.joined_at.getTime() - b.joined_at.getTime());
    return {
      items: list.slice(skip, skip + take),
      total: list.length,
    };
  }

  public getMemberCount(org_id: string): number {
    let count = 0;
    for (const m of this.members.values()) {
      if (m.org_id === org_id) count++;
    }
    return count;
  }

  // --- Community Followers ---
  public addFollower(community_org_id: string, user_id: string): DbCommunityFollower {
    const id = crypto.randomUUID();
    const follower: DbCommunityFollower = {
      id,
      community_org_id,
      user_id,
      followed_at: new Date(),
    };
    this.followers.set(`${community_org_id}_${user_id}`, follower);
    return follower;
  }

  public findFollower(community_org_id: string, user_id: string): DbCommunityFollower | null {
    return this.followers.get(`${community_org_id}_${user_id}`) || null;
  }

  public removeFollower(community_org_id: string, user_id: string): boolean {
    return this.followers.delete(`${community_org_id}_${user_id}`);
  }

  public getFollowers(community_org_id: string, skip = 0, take = 10) {
    const list: DbCommunityFollower[] = [];
    for (const f of this.followers.values()) {
      if (f.community_org_id === community_org_id) {
        list.push(f);
      }
    }
    list.sort((a, b) => b.followed_at.getTime() - a.followed_at.getTime());
    return {
      items: list.slice(skip, skip + take),
      total: list.length,
    };
  }

  public getFollowerCount(community_org_id: string): number {
    let count = 0;
    for (const f of this.followers.values()) {
      if (f.community_org_id === community_org_id) count++;
    }
    return count;
  }

  // --- Audit Logs ---
  public createAuditLog(data: {
    actor_user_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    metadata?: any;
  }): DbAuditLog {
    const entry: DbAuditLog = {
      id: crypto.randomUUID(),
      actor_user_id: data.actor_user_id || null,
      action: data.action,
      target_type: data.target_type,
      target_id: data.target_id,
      metadata: data.metadata || null,
      created_at: new Date(),
    };
    this.auditLogs.unshift(entry);
    return entry;
  }
}

export const memoryDb = new MemoryDatabase();
