import {
  CollaborationType,
  CollaborationStatus,
  RoleType,
} from '@eventops/shared-types';
import { collaborationRepository, CollaborationRepository } from './collaboration.repository';
import { AppError } from '../../middleware/errorHandler';

export class CollaborationService {
  constructor(private readonly repo: CollaborationRepository = collaborationRepository) {}

  private async verifyOrgAccess(orgId: string, userId: string, roles: RoleType[] = []): Promise<boolean> {
    if (roles.includes(RoleType.PLATFORM_ADMIN)) {
      return true;
    }
    const member = await this.repo.findOrgMember(orgId, userId);
    return !!member;
  }

  public async proposeCollaboration(params: {
    userId: string;
    userRoles: RoleType[];
    eventId: string;
    requestingOrgId: string;
    targetOrgId: string;
    collabType: CollaborationType;
    initialMessage: string;
  }) {
    const { userId, userRoles, eventId, requestingOrgId, targetOrgId, collabType, initialMessage } = params;

    if (requestingOrgId === targetOrgId) {
      throw new AppError('Cannot propose collaboration with your own organization', 400);
    }

    const hasAccess = await this.verifyOrgAccess(requestingOrgId, userId, userRoles);
    if (!hasAccess) {
      throw new AppError('You must be a member of the requesting organization to propose a collaboration', 403);
    }

    const targetOrg = await this.repo.findOrgById(targetOrgId);
    if (!targetOrg) {
      throw new AppError('Target organization not found', 404);
    }

    const event = await this.repo.findEventById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    if (event.organizer_org_id !== requestingOrgId) {
      throw new AppError('Collaboration proposals can only be initiated for events organized by your organization', 400);
    }

    const collaboration = await this.repo.create({
      event_id: eventId,
      requesting_org_id: requestingOrgId,
      target_org_id: targetOrgId,
      collab_type: collabType,
      status: CollaborationStatus.PROPOSED,
    });

    if (initialMessage && initialMessage.trim().length > 0) {
      await this.repo.createMessage({
        collaboration_id: collaboration.id,
        sender_org_id: requestingOrgId,
        body: initialMessage.trim(),
        is_counterproposal: false,
      });
    }

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'COLLABORATION_PROPOSED',
      target_type: 'collaboration',
      target_id: collaboration.id,
      metadata: {
        event_id: eventId,
        requesting_org_id: requestingOrgId,
        target_org_id: targetOrgId,
        collab_type: collabType,
      },
    });

    return this.repo.findById(collaboration.id);
  }

  public async getCollaborations(options: {
    userId: string;
    userRoles: RoleType[];
    orgId?: string;
    eventId?: string;
    status?: CollaborationStatus;
    collabType?: CollaborationType;
    page: number;
    limit: number;
  }) {
    const { userId, userRoles, orgId, eventId, status, collabType, page, limit } = options;

    if (orgId) {
      const hasAccess = await this.verifyOrgAccess(orgId, userId, userRoles);
      if (!hasAccess) {
        throw new AppError('Forbidden access to collaborations for this organization', 403);
      }
    }

    return this.repo.findPaginated({
      org_id: orgId,
      event_id: eventId,
      status,
      collab_type: collabType,
      page,
      limit,
    });
  }

  public async getCollaborationById(id: string, userId: string, userRoles: RoleType[] = []) {
    const collab = await this.repo.findById(id);
    if (!collab) {
      throw new AppError('Collaboration proposal not found', 404);
    }

    if (!userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);
      const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
      if (!isReqMember && !isTargetMember) {
        throw new AppError('Forbidden access to this collaboration', 403);
      }
    }

    return collab;
  }

  public async respondToCollaboration(params: {
    collaborationId: string;
    userId: string;
    userRoles: RoleType[];
    action: 'accept' | 'reject' | 'counter';
    message?: string;
  }) {
    const { collaborationId, userId, userRoles, action, message } = params;

    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration proposal not found', 404);
    }

    if (collab.status === CollaborationStatus.ACCEPTED) {
      throw new AppError('Collaboration is already accepted', 400);
    }
    if (collab.status === CollaborationStatus.REJECTED) {
      throw new AppError('Collaboration has already been rejected', 400);
    }

    const isPlatformAdmin = userRoles.includes(RoleType.PLATFORM_ADMIN);
    const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
    const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);

    let senderOrgId = collab.target_org_id;
    if (isTargetMember) {
      senderOrgId = collab.target_org_id;
    } else if (isReqMember && collab.status === CollaborationStatus.COUNTERED) {
      // Requesting org can respond back if target org sent counter-proposal
      senderOrgId = collab.requesting_org_id;
    } else if (!isPlatformAdmin) {
      throw new AppError('You are not authorized to respond to this collaboration proposal', 403);
    }

    let nextStatus: CollaborationStatus;
    let auditAction: string;

    if (action === 'accept') {
      nextStatus = CollaborationStatus.ACCEPTED;
      auditAction = 'COLLABORATION_ACCEPTED';

      await this.repo.updateStatus(collaborationId, nextStatus);

      // Initialize default tasks for shared workspace
      await this.repo.createTask({
        collaboration_id: collaborationId,
        title: 'Initial Kickoff & Alignment Meeting',
        description: 'Sync between both teams to finalize roles, timeline, and goals.',
        assigned_org_id: collab.requesting_org_id,
      });

      await this.repo.createTask({
        collaboration_id: collaborationId,
        title: 'Co-Branded Marketing & Announcements',
        description: 'Draft joint social media posts, newsletter blurbs, and banner assets.',
        assigned_org_id: collab.target_org_id,
      });

      await this.repo.createTask({
        collaboration_id: collaborationId,
        title: 'Event Operations & Check-In Logistics',
        description: 'Verify venue/stream links, check-in devices, and staffing on event day.',
      });

      if (message && message.trim().length > 0) {
        await this.repo.createMessage({
          collaboration_id: collaborationId,
          sender_org_id: senderOrgId,
          body: message.trim(),
          is_counterproposal: false,
        });
      }
    } else if (action === 'reject') {
      nextStatus = CollaborationStatus.REJECTED;
      auditAction = 'COLLABORATION_REJECTED';

      await this.repo.updateStatus(collaborationId, nextStatus);

      if (message && message.trim().length > 0) {
        await this.repo.createMessage({
          collaboration_id: collaborationId,
          sender_org_id: senderOrgId,
          body: message.trim(),
          is_counterproposal: false,
        });
      }
    } else if (action === 'counter') {
      nextStatus = CollaborationStatus.COUNTERED;
      auditAction = 'COLLABORATION_COUNTERED';

      if (!message || message.trim().length === 0) {
        throw new AppError('A message or explanation is required when countering a proposal', 400);
      }

      await this.repo.updateStatus(collaborationId, nextStatus);

      await this.repo.createMessage({
        collaboration_id: collaborationId,
        sender_org_id: senderOrgId,
        body: message.trim(),
        is_counterproposal: true,
      });
    } else {
      throw new AppError(`Invalid action: ${action}`, 400);
    }

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: auditAction,
      target_type: 'collaboration',
      target_id: collaborationId,
      metadata: {
        action,
        status: nextStatus,
        sender_org_id: senderOrgId,
      },
    });

    return this.repo.findById(collaborationId);
  }

  public async sendMessage(params: {
    collaborationId: string;
    userId: string;
    userRoles: RoleType[];
    senderOrgId: string;
    body: string;
    isCounterproposal?: boolean;
  }) {
    const { collaborationId, userId, userRoles, senderOrgId, body, isCounterproposal } = params;

    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration not found', 404);
    }

    if (collab.requesting_org_id !== senderOrgId && collab.target_org_id !== senderOrgId) {
      throw new AppError('Sender organization does not belong to this collaboration', 400);
    }

    const hasAccess = await this.verifyOrgAccess(senderOrgId, userId, userRoles);
    if (!hasAccess) {
      throw new AppError('Forbidden: You do not represent the sender organization', 403);
    }

    if (!body || body.trim().length === 0) {
      throw new AppError('Message body cannot be empty', 400);
    }

    const message = await this.repo.createMessage({
      collaboration_id: collaborationId,
      sender_org_id: senderOrgId,
      body: body.trim(),
      is_counterproposal: !!isCounterproposal,
    });

    if (isCounterproposal && collab.status !== CollaborationStatus.ACCEPTED && collab.status !== CollaborationStatus.REJECTED) {
      await this.repo.updateStatus(collaborationId, CollaborationStatus.COUNTERED);
    }

    return message;
  }

  // --- Shared Workspace ---
  public async getWorkspace(collaborationId: string, userId: string, userRoles: RoleType[] = []) {
    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration not found', 404);
    }

    if (!userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);
      const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
      if (!isReqMember && !isTargetMember) {
        throw new AppError('Forbidden access to this collaboration workspace', 403);
      }
    }

    // Invariant: Collaboration MUST be accepted to view or edit shared workspace
    if (collab.status !== CollaborationStatus.ACCEPTED) {
      throw new AppError(`Shared workspace is only available for accepted collaborations (current status: ${collab.status})`, 400);
    }

    const tasks = await this.repo.getTasks(collaborationId);
    const messages = await this.repo.getMessages(collaborationId);

    return {
      collaboration: collab,
      tasks,
      messages,
    };
  }

  public async createTask(params: {
    collaborationId: string;
    userId: string;
    userRoles: RoleType[];
    title: string;
    description?: string;
    assignedOrgId?: string;
  }) {
    const { collaborationId, userId, userRoles, title, description, assignedOrgId } = params;

    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration not found', 404);
    }

    if (!userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);
      const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
      if (!isReqMember && !isTargetMember) {
        throw new AppError('Forbidden: You must belong to a partner organization to add tasks', 403);
      }
    }

    if (collab.status !== CollaborationStatus.ACCEPTED) {
      throw new AppError('Tasks can only be created in an accepted collaboration workspace', 400);
    }

    if (!title || title.trim().length === 0) {
      throw new AppError('Task title is required', 400);
    }

    if (assignedOrgId && assignedOrgId !== collab.requesting_org_id && assignedOrgId !== collab.target_org_id) {
      throw new AppError('Task can only be assigned to a partner organization', 400);
    }

    const task = await this.repo.createTask({
      collaboration_id: collaborationId,
      title: title.trim(),
      description: description ? description.trim() : null,
      assigned_org_id: assignedOrgId || null,
      completed: false,
    });

    await this.repo.createAuditLog({
      actor_user_id: userId,
      action: 'COLLABORATION_TASK_CREATED',
      target_type: 'collaboration_task',
      target_id: task.id,
      metadata: {
        collaboration_id: collaborationId,
        title: task.title,
      },
    });

    return task;
  }

  public async updateTask(params: {
    collaborationId: string;
    taskId: string;
    userId: string;
    userRoles: RoleType[];
    title?: string;
    description?: string;
    assignedOrgId?: string | null;
    completed?: boolean;
  }) {
    const { collaborationId, taskId, userId, userRoles, title, description, assignedOrgId, completed } = params;

    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration not found', 404);
    }

    if (!userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);
      const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
      if (!isReqMember && !isTargetMember) {
        throw new AppError('Forbidden: You must belong to a partner organization to update tasks', 403);
      }
    }

    if (collab.status !== CollaborationStatus.ACCEPTED) {
      throw new AppError('Tasks can only be modified in an accepted collaboration workspace', 400);
    }

    const task = await this.repo.findTaskById(taskId);
    if (!task || task.collaboration_id !== collaborationId) {
      throw new AppError('Task not found in this collaboration', 404);
    }

    const updates: any = {};
    if (title !== undefined) {
      if (title.trim().length === 0) throw new AppError('Task title cannot be empty', 400);
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }
    if (assignedOrgId !== undefined) {
      if (assignedOrgId && assignedOrgId !== collab.requesting_org_id && assignedOrgId !== collab.target_org_id) {
        throw new AppError('Task can only be assigned to a partner organization', 400);
      }
      updates.assigned_org_id = assignedOrgId;
    }
    if (completed !== undefined) {
      updates.completed = !!completed;
    }

    return this.repo.updateTask(taskId, updates);
  }

  public async deleteTask(params: {
    collaborationId: string;
    taskId: string;
    userId: string;
    userRoles: RoleType[];
  }) {
    const { collaborationId, taskId, userId, userRoles } = params;

    const collab = await this.repo.findById(collaborationId);
    if (!collab) {
      throw new AppError('Collaboration not found', 404);
    }

    if (!userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      const isReqMember = await this.repo.findOrgMember(collab.requesting_org_id, userId);
      const isTargetMember = await this.repo.findOrgMember(collab.target_org_id, userId);
      if (!isReqMember && !isTargetMember) {
        throw new AppError('Forbidden: You must belong to a partner organization to delete tasks', 403);
      }
    }

    if (collab.status !== CollaborationStatus.ACCEPTED) {
      throw new AppError('Tasks can only be deleted in an accepted collaboration workspace', 400);
    }

    const task = await this.repo.findTaskById(taskId);
    if (!task || task.collaboration_id !== collaborationId) {
      throw new AppError('Task not found in this collaboration', 404);
    }

    return this.repo.deleteTask(taskId);
  }
}

export const collaborationService = new CollaborationService();
