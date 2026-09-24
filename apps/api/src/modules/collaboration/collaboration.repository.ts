import {
  CollaborationType,
  CollaborationStatus,
} from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import {
  memoryDb,
  DbCollaboration,
  DbCollaborationMessage,
  DbCollaborationTask,
} from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class CollaborationRepository {
  public async create(data: {
    event_id: string;
    requesting_org_id: string;
    target_org_id: string;
    collab_type: CollaborationType;
    status?: CollaborationStatus;
  }) {
    try {
      return await prisma.collaboration.create({
        data: {
          event_id: data.event_id,
          requesting_org_id: data.requesting_org_id,
          target_org_id: data.target_org_id,
          collab_type: data.collab_type as any,
          status: (data.status || CollaborationStatus.PROPOSED) as any,
        },
        include: {
          event: true,
          requesting_org: true,
          target_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma create collaboration failed, using memory store');
      const collab = memoryDb.createCollaboration(data);
      const ev = memoryDb.findEventById(collab.event_id);
      const reqOrg = memoryDb.findOrganizationById(collab.requesting_org_id);
      const tgtOrg = memoryDb.findOrganizationById(collab.target_org_id);
      return {
        ...collab,
        event: ev || undefined,
        requesting_org: reqOrg || undefined,
        target_org: tgtOrg || undefined,
      };
    }
  }

  public async findById(id: string) {
    try {
      return await prisma.collaboration.findUnique({
        where: { id },
        include: {
          event: { include: { organizer: true } },
          requesting_org: true,
          target_org: true,
          messages: {
            include: { sender_org: true },
            orderBy: { created_at: 'asc' },
          },
          tasks: {
            include: { assigned_org: true },
            orderBy: { created_at: 'asc' },
          },
        },
      });
    } catch (error) {
      logger.debug('Prisma findById collaboration failed, using memory store');
      const collab = memoryDb.findCollaborationById(id);
      if (!collab) return null;

      const ev = memoryDb.findEventById(collab.event_id);
      const reqOrg = memoryDb.findOrganizationById(collab.requesting_org_id);
      const tgtOrg = memoryDb.findOrganizationById(collab.target_org_id);

      const rawMessages = memoryDb.getCollaborationMessages(id);
      const messages = rawMessages.map((m) => ({
        ...m,
        sender_org: memoryDb.findOrganizationById(m.sender_org_id) || undefined,
      }));

      const rawTasks = memoryDb.getCollaborationTasks(id);
      const tasks = rawTasks.map((t) => ({
        ...t,
        assigned_org: t.assigned_org_id
          ? memoryDb.findOrganizationById(t.assigned_org_id) || undefined
          : undefined,
      }));

      return {
        ...collab,
        event: ev ? { ...ev, organizer: memoryDb.findOrganizationById(ev.organizer_org_id) || undefined } : undefined,
        requesting_org: reqOrg || undefined,
        target_org: tgtOrg || undefined,
        messages,
        tasks,
      };
    }
  }

  public async updateStatus(id: string, status: CollaborationStatus) {
    try {
      return await prisma.collaboration.update({
        where: { id },
        data: { status: status as any },
      });
    } catch (error) {
      return memoryDb.updateCollaboration(id, { status });
    }
  }

  public async findPaginated(options: {
    org_id?: string;
    event_id?: string;
    status?: CollaborationStatus;
    collab_type?: CollaborationType;
    page: number;
    limit: number;
  }) {
    const { org_id, event_id, status, collab_type, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (org_id) {
        where.OR = [
          { requesting_org_id: org_id },
          { target_org_id: org_id },
        ];
      }
      if (event_id) where.event_id = event_id;
      if (status) where.status = status;
      if (collab_type) where.collab_type = collab_type;

      const [items, total] = await Promise.all([
        prisma.collaboration.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updated_at: 'desc' },
          include: {
            event: true,
            requesting_org: true,
            target_org: true,
          },
        }),
        prisma.collaboration.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findPaginated collaborations failed, using memory store');
      const res = memoryDb.findCollaborations({
        org_id,
        event_id,
        status,
        collab_type,
        skip,
        take: limit,
      });

      const items = res.items.map((c) => {
        const ev = memoryDb.findEventById(c.event_id);
        const reqOrg = memoryDb.findOrganizationById(c.requesting_org_id);
        const tgtOrg = memoryDb.findOrganizationById(c.target_org_id);
        return {
          ...c,
          event: ev || undefined,
          requesting_org: reqOrg || undefined,
          target_org: tgtOrg || undefined,
        };
      });

      return { items, total: res.total };
    }
  }

  // --- Messages ---
  public async createMessage(data: {
    collaboration_id: string;
    sender_org_id: string;
    body: string;
    is_counterproposal?: boolean;
  }) {
    try {
      return await prisma.collaborationMessage.create({
        data: {
          collaboration_id: data.collaboration_id,
          sender_org_id: data.sender_org_id,
          body: data.body,
          is_counterproposal: data.is_counterproposal || false,
        },
        include: {
          sender_org: true,
        },
      });
    } catch (error) {
      const msg = memoryDb.createCollaborationMessage(data);
      const sender = memoryDb.findOrganizationById(msg.sender_org_id);
      return { ...msg, sender_org: sender || undefined };
    }
  }

  public async getMessages(collaboration_id: string) {
    try {
      return await prisma.collaborationMessage.findMany({
        where: { collaboration_id },
        orderBy: { created_at: 'asc' },
        include: { sender_org: true },
      });
    } catch (error) {
      const msgs = memoryDb.getCollaborationMessages(collaboration_id);
      return msgs.map((m) => ({
        ...m,
        sender_org: memoryDb.findOrganizationById(m.sender_org_id) || undefined,
      }));
    }
  }

  // --- Tasks ---
  public async createTask(data: {
    collaboration_id: string;
    title: string;
    description?: string | null;
    assigned_org_id?: string | null;
    completed?: boolean;
  }) {
    try {
      return await prisma.collaborationTask.create({
        data: {
          collaboration_id: data.collaboration_id,
          title: data.title,
          description: data.description || null,
          assigned_org_id: data.assigned_org_id || null,
          completed: data.completed || false,
        },
        include: { assigned_org: true },
      });
    } catch (error) {
      const task = memoryDb.createCollaborationTask(data);
      const assigned = task.assigned_org_id
        ? memoryDb.findOrganizationById(task.assigned_org_id)
        : null;
      return { ...task, assigned_org: assigned || undefined };
    }
  }

  public async findTaskById(id: string) {
    try {
      return await prisma.collaborationTask.findUnique({
        where: { id },
        include: { assigned_org: true },
      });
    } catch (error) {
      const task = memoryDb.findCollaborationTaskById(id);
      if (!task) return null;
      const assigned = task.assigned_org_id
        ? memoryDb.findOrganizationById(task.assigned_org_id)
        : null;
      return { ...task, assigned_org: assigned || undefined };
    }
  }

  public async updateTask(id: string, updates: Partial<DbCollaborationTask>) {
    try {
      return await prisma.collaborationTask.update({
        where: { id },
        data: updates as any,
        include: { assigned_org: true },
      });
    } catch (error) {
      const task = memoryDb.updateCollaborationTask(id, updates);
      if (!task) return null;
      const assigned = task.assigned_org_id
        ? memoryDb.findOrganizationById(task.assigned_org_id)
        : null;
      return { ...task, assigned_org: assigned || undefined };
    }
  }

  public async deleteTask(id: string) {
    try {
      await prisma.collaborationTask.delete({ where: { id } });
      return true;
    } catch (error) {
      return memoryDb.deleteCollaborationTask(id);
    }
  }

  public async getTasks(collaboration_id: string) {
    try {
      return await prisma.collaborationTask.findMany({
        where: { collaboration_id },
        orderBy: { created_at: 'asc' },
        include: { assigned_org: true },
      });
    } catch (error) {
      const tasks = memoryDb.getCollaborationTasks(collaboration_id);
      return tasks.map((t) => ({
        ...t,
        assigned_org: t.assigned_org_id
          ? memoryDb.findOrganizationById(t.assigned_org_id) || undefined
          : undefined,
      }));
    }
  }

  public async findOrgMember(org_id: string, user_id: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: { org_id_user_id: { org_id, user_id } },
      });
    } catch (error) {
      return memoryDb.findMember(org_id, user_id);
    }
  }

  public async findOrgById(id: string) {
    try {
      return await prisma.organization.findUnique({ where: { id } });
    } catch (error) {
      return memoryDb.findOrganizationById(id);
    }
  }

  public async findEventById(id: string) {
    try {
      return await prisma.event.findUnique({ where: { id } });
    } catch (error) {
      return memoryDb.findEventById(id);
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

export const collaborationRepository = new CollaborationRepository();
