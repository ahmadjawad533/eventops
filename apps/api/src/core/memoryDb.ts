import crypto from 'crypto';
import {
  RoleType,
  OrganizationType,
  OrgMemberRole,
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
  CollaborationType,
  CollaborationStatus,
  OutreachStatus,
} from '@eventops/shared-types';

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

export interface DbEvent {
  id: string;
  organizer_org_id: string;
  title: string;
  description: string;
  category: EventCategory;
  format: EventFormat;
  start_date: Date;
  end_date: Date;
  location?: string | null;
  capacity: number;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DbEventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  status: RegistrationStatus;
  registered_at: Date;
  checked_in_at?: Date | null;
}

export interface DbCertificate {
  id: string;
  registration_id: string;
  verification_id: string;
  issued_at: Date;
}

export interface DbCollaboration {
  id: string;
  event_id: string;
  requesting_org_id: string;
  target_org_id: string;
  collab_type: CollaborationType;
  status: CollaborationStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DbCollaborationMessage {
  id: string;
  collaboration_id: string;
  sender_org_id: string;
  body: string;
  is_counterproposal: boolean;
  created_at: Date;
}

export interface DbCollaborationTask {
  id: string;
  collaboration_id: string;
  title: string;
  description?: string | null;
  assigned_org_id?: string | null;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DbOutreachRequest {
  id: string;
  requesting_org_id: string;
  target_community_org_id: string;
  event_id: string;
  purpose: string;
  target_audience: string;
  requested_recipient_count: number;
  message_subject: string;
  message_body: string;
  status: OutreachStatus;
  reviewed_by_user_id?: string | null;
  reviewed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbOutreachCampaign {
  id: string;
  outreach_request_id: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  registrations_count: number;
  created_at: Date;
  updated_at: Date;
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
  public events: Map<string, DbEvent> = new Map();
  public registrations: Map<string, DbEventRegistration> = new Map();
  public certificates: Map<string, DbCertificate> = new Map();
  public collaborations: Map<string, DbCollaboration> = new Map();
  public collaborationMessages: Map<string, DbCollaborationMessage> = new Map();
  public collaborationTasks: Map<string, DbCollaborationTask> = new Map();
  public outreachRequests: Map<string, DbOutreachRequest> = new Map();
  public outreachCampaigns: Map<string, DbOutreachCampaign> = new Map();
  public auditLogs: DbAuditLog[] = [];

  public clear() {
    this.users.clear();
    this.roles.clear();
    this.organizations.clear();
    this.members.clear();
    this.followers.clear();
    this.events.clear();
    this.registrations.clear();
    this.certificates.clear();
    this.collaborations.clear();
    this.collaborationMessages.clear();
    this.collaborationTasks.clear();
    this.outreachRequests.clear();
    this.outreachCampaigns.clear();
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

  // --- Events ---
  public createEvent(data: {
    organizer_org_id: string;
    title: string;
    description: string;
    category: EventCategory;
    format: EventFormat;
    start_date: Date;
    end_date: Date;
    location?: string | null;
    capacity: number;
    status?: EventStatus;
  }): DbEvent {
    const id = crypto.randomUUID();
    const now = new Date();
    const event: DbEvent = {
      id,
      organizer_org_id: data.organizer_org_id,
      title: data.title,
      description: data.description,
      category: data.category,
      format: data.format,
      start_date: data.start_date,
      end_date: data.end_date,
      location: data.location || null,
      capacity: data.capacity,
      status: data.status || EventStatus.DRAFT,
      created_at: now,
      updated_at: now,
    };
    this.events.set(id, event);
    return event;
  }

  public findEventById(id: string): DbEvent | null {
    return this.events.get(id) || null;
  }

  public updateEvent(id: string, updates: Partial<DbEvent>): DbEvent | null {
    const event = this.events.get(id);
    if (!event) return null;
    const updated: DbEvent = {
      ...event,
      ...updates,
      updated_at: new Date(),
    };
    this.events.set(id, updated);
    return updated;
  }

  public findEvents(filter?: {
    category?: EventCategory;
    format?: EventFormat;
    status?: EventStatus;
    location?: string;
    organizer_org_id?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    let list = Array.from(this.events.values());

    if (filter?.category) list = list.filter((e) => e.category === filter.category);
    if (filter?.format) list = list.filter((e) => e.format === filter.format);
    if (filter?.status) list = list.filter((e) => e.status === filter.status);
    if (filter?.organizer_org_id) list = list.filter((e) => e.organizer_org_id === filter.organizer_org_id);
    if (filter?.location) {
      const loc = filter.location.toLowerCase();
      list = list.filter((e) => e.location && e.location.toLowerCase().includes(loc));
    }
    if (filter?.startDate) list = list.filter((e) => e.start_date >= filter.startDate!);
    if (filter?.endDate) list = list.filter((e) => e.end_date <= filter.endDate!);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    const total = list.length;
    const skip = filter?.skip || 0;
    const take = filter?.take || 10;
    return {
      items: list.slice(skip, skip + take),
      total,
    };
  }

  // --- Event Registrations ---
  public createRegistration(data: {
    event_id: string;
    user_id: string;
    ticket_code: string;
    status?: RegistrationStatus;
  }): DbEventRegistration {
    const id = crypto.randomUUID();
    const reg: DbEventRegistration = {
      id,
      event_id: data.event_id,
      user_id: data.user_id,
      ticket_code: data.ticket_code,
      status: data.status || RegistrationStatus.REGISTERED,
      registered_at: new Date(),
      checked_in_at: null,
    };
    this.registrations.set(id, reg);
    return reg;
  }

  public findRegistrationById(id: string): DbEventRegistration | null {
    return this.registrations.get(id) || null;
  }

  public findRegistrationByTicketCode(ticketCode: string): DbEventRegistration | null {
    for (const r of this.registrations.values()) {
      if (r.ticket_code === ticketCode) return r;
    }
    return null;
  }

  public findRegistration(eventId: string, userId: string): DbEventRegistration | null {
    for (const r of this.registrations.values()) {
      if (r.event_id === eventId && r.user_id === userId) return r;
    }
    return null;
  }

  public countRegistrations(eventId: string): number {
    let count = 0;
    for (const r of this.registrations.values()) {
      if (r.event_id === eventId) count++;
    }
    return count;
  }

  public updateRegistration(id: string, updates: Partial<DbEventRegistration>): DbEventRegistration | null {
    const reg = this.registrations.get(id);
    if (!reg) return null;
    const updated: DbEventRegistration = {
      ...reg,
      ...updates,
    };
    this.registrations.set(id, updated);
    return updated;
  }

  public getEventRegistrations(eventId: string, skip = 0, take = 10) {
    const list: DbEventRegistration[] = [];
    for (const r of this.registrations.values()) {
      if (r.event_id === eventId) list.push(r);
    }
    list.sort((a, b) => b.registered_at.getTime() - a.registered_at.getTime());
    return {
      items: list.slice(skip, skip + take),
      total: list.length,
    };
  }

  public getUserRegistrations(userId: string, skip = 0, take = 10) {
    const list: DbEventRegistration[] = [];
    for (const r of this.registrations.values()) {
      if (r.user_id === userId) list.push(r);
    }
    list.sort((a, b) => b.registered_at.getTime() - a.registered_at.getTime());
    return {
      items: list.slice(skip, skip + take),
      total: list.length,
    };
  }

  // --- Certificates ---
  public createCertificate(data: {
    registration_id: string;
    verification_id: string;
  }): DbCertificate {
    const id = crypto.randomUUID();
    const cert: DbCertificate = {
      id,
      registration_id: data.registration_id,
      verification_id: data.verification_id,
      issued_at: new Date(),
    };
    this.certificates.set(id, cert);
    return cert;
  }

  public findCertificateByRegistrationId(registrationId: string): DbCertificate | null {
    for (const c of this.certificates.values()) {
      if (c.registration_id === registrationId) return c;
    }
    return null;
  }

  public findCertificateByVerificationId(verificationId: string): DbCertificate | null {
    for (const c of this.certificates.values()) {
      if (c.verification_id.toLowerCase() === verificationId.toLowerCase()) return c;
    }
    return null;
  }

  // --- Collaborations ---
  public createCollaboration(data: {
    event_id: string;
    requesting_org_id: string;
    target_org_id: string;
    collab_type: CollaborationType;
    status?: CollaborationStatus;
  }): DbCollaboration {
    const id = crypto.randomUUID();
    const now = new Date();
    const collab: DbCollaboration = {
      id,
      event_id: data.event_id,
      requesting_org_id: data.requesting_org_id,
      target_org_id: data.target_org_id,
      collab_type: data.collab_type,
      status: data.status || CollaborationStatus.PROPOSED,
      created_at: now,
      updated_at: now,
    };
    this.collaborations.set(id, collab);
    return collab;
  }

  public findCollaborationById(id: string): DbCollaboration | null {
    return this.collaborations.get(id) || null;
  }

  public updateCollaboration(id: string, updates: Partial<DbCollaboration>): DbCollaboration | null {
    const collab = this.collaborations.get(id);
    if (!collab) return null;
    const updated: DbCollaboration = {
      ...collab,
      ...updates,
      updated_at: new Date(),
    };
    this.collaborations.set(id, updated);
    return updated;
  }

  public findCollaborations(filter?: {
    org_id?: string;
    event_id?: string;
    status?: CollaborationStatus;
    collab_type?: CollaborationType;
    skip?: number;
    take?: number;
  }) {
    let list = Array.from(this.collaborations.values());

    if (filter?.org_id) {
      list = list.filter(
        (c) => c.requesting_org_id === filter.org_id || c.target_org_id === filter.org_id
      );
    }
    if (filter?.event_id) {
      list = list.filter((c) => c.event_id === filter.event_id);
    }
    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.collab_type) {
      list = list.filter((c) => c.collab_type === filter.collab_type);
    }

    list.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    const total = list.length;
    const skip = filter?.skip || 0;
    const take = filter?.take || 10;
    return {
      items: list.slice(skip, skip + take),
      total,
    };
  }

  // --- Collaboration Messages ---
  public createCollaborationMessage(data: {
    collaboration_id: string;
    sender_org_id: string;
    body: string;
    is_counterproposal?: boolean;
  }): DbCollaborationMessage {
    const id = crypto.randomUUID();
    const msg: DbCollaborationMessage = {
      id,
      collaboration_id: data.collaboration_id,
      sender_org_id: data.sender_org_id,
      body: data.body,
      is_counterproposal: data.is_counterproposal || false,
      created_at: new Date(),
    };
    this.collaborationMessages.set(id, msg);
    return msg;
  }

  public getCollaborationMessages(collaboration_id: string): DbCollaborationMessage[] {
    const list: DbCollaborationMessage[] = [];
    for (const msg of this.collaborationMessages.values()) {
      if (msg.collaboration_id === collaboration_id) {
        list.push(msg);
      }
    }
    list.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    return list;
  }

  // --- Collaboration Tasks ---
  public createCollaborationTask(data: {
    collaboration_id: string;
    title: string;
    description?: string | null;
    assigned_org_id?: string | null;
    completed?: boolean;
  }): DbCollaborationTask {
    const id = crypto.randomUUID();
    const now = new Date();
    const task: DbCollaborationTask = {
      id,
      collaboration_id: data.collaboration_id,
      title: data.title,
      description: data.description || null,
      assigned_org_id: data.assigned_org_id || null,
      completed: data.completed || false,
      created_at: now,
      updated_at: now,
    };
    this.collaborationTasks.set(id, task);
    return task;
  }

  public findCollaborationTaskById(id: string): DbCollaborationTask | null {
    return this.collaborationTasks.get(id) || null;
  }

  public updateCollaborationTask(id: string, updates: Partial<DbCollaborationTask>): DbCollaborationTask | null {
    const task = this.collaborationTasks.get(id);
    if (!task) return null;
    const updated: DbCollaborationTask = {
      ...task,
      ...updates,
      updated_at: new Date(),
    };
    this.collaborationTasks.set(id, updated);
    return updated;
  }

  public deleteCollaborationTask(id: string): boolean {
    return this.collaborationTasks.delete(id);
  }

  public getCollaborationTasks(collaboration_id: string): DbCollaborationTask[] {
    const list: DbCollaborationTask[] = [];
    for (const task of this.collaborationTasks.values()) {
      if (task.collaboration_id === collaboration_id) {
        list.push(task);
      }
    }
    list.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    return list;
  }

  // --- Outreach Requests ---
  public createOutreachRequest(data: {
    requesting_org_id: string;
    target_community_org_id: string;
    event_id: string;
    purpose: string;
    target_audience: string;
    requested_recipient_count: number;
    message_subject: string;
    message_body: string;
    status?: OutreachStatus;
  }): DbOutreachRequest {
    const id = crypto.randomUUID();
    const now = new Date();
    const req: DbOutreachRequest = {
      id,
      requesting_org_id: data.requesting_org_id,
      target_community_org_id: data.target_community_org_id,
      event_id: data.event_id,
      purpose: data.purpose,
      target_audience: data.target_audience,
      requested_recipient_count: data.requested_recipient_count,
      message_subject: data.message_subject,
      message_body: data.message_body,
      status: data.status || OutreachStatus.PENDING,
      reviewed_by_user_id: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    };
    this.outreachRequests.set(id, req);
    return req;
  }

  public findOutreachRequestById(id: string): DbOutreachRequest | null {
    return this.outreachRequests.get(id) || null;
  }

  public updateOutreachRequest(id: string, updates: Partial<DbOutreachRequest>): DbOutreachRequest | null {
    const req = this.outreachRequests.get(id);
    if (!req) return null;
    const updated: DbOutreachRequest = {
      ...req,
      ...updates,
      updated_at: new Date(),
    };
    this.outreachRequests.set(id, updated);
    return updated;
  }

  public findOutreachRequests(filter?: {
    requesting_org_id?: string;
    target_community_org_id?: string;
    event_id?: string;
    status?: OutreachStatus;
    skip?: number;
    take?: number;
  }) {
    let list = Array.from(this.outreachRequests.values());

    if (filter?.requesting_org_id) {
      list = list.filter((r) => r.requesting_org_id === filter.requesting_org_id);
    }
    if (filter?.target_community_org_id) {
      list = list.filter((r) => r.target_community_org_id === filter.target_community_org_id);
    }
    if (filter?.event_id) {
      list = list.filter((r) => r.event_id === filter.event_id);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
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

  public countDailyOutreachRequests(requesting_org_id: string, sinceDate: Date): number {
    let count = 0;
    for (const r of this.outreachRequests.values()) {
      if (r.requesting_org_id === requesting_org_id && r.created_at >= sinceDate) {
        count++;
      }
    }
    return count;
  }

  // --- Outreach Campaigns ---
  public createOutreachCampaign(data: {
    outreach_request_id: string;
    sent_count?: number;
    delivered_count?: number;
    opened_count?: number;
    clicked_count?: number;
    registrations_count?: number;
  }): DbOutreachCampaign {
    const id = crypto.randomUUID();
    const now = new Date();
    const campaign: DbOutreachCampaign = {
      id,
      outreach_request_id: data.outreach_request_id,
      sent_count: data.sent_count || 0,
      delivered_count: data.delivered_count || 0,
      opened_count: data.opened_count || 0,
      clicked_count: data.clicked_count || 0,
      registrations_count: data.registrations_count || 0,
      created_at: now,
      updated_at: now,
    };
    this.outreachCampaigns.set(data.outreach_request_id, campaign);
    return campaign;
  }

  public findOutreachCampaignByRequestId(requestId: string): DbOutreachCampaign | null {
    return this.outreachCampaigns.get(requestId) || null;
  }

  public updateOutreachCampaign(
    requestId: string,
    updates: Partial<DbOutreachCampaign>
  ): DbOutreachCampaign | null {
    const c = this.outreachCampaigns.get(requestId);
    if (!c) return null;
    const updated: DbOutreachCampaign = {
      ...c,
      ...updates,
      updated_at: new Date(),
    };
    this.outreachCampaigns.set(requestId, updated);
    return updated;
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
