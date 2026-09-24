import { Request, Response, NextFunction } from 'express';
import { collaborationService, CollaborationService } from './collaboration.service';
import {
  CollaborationType,
  CollaborationStatus,
  ApiResponse,
} from '@eventops/shared-types';

export class CollaborationController {
  constructor(private readonly service: CollaborationService = collaborationService) {}

  public propose = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const {
        event_id,
        requesting_org_id,
        target_org_id,
        collab_type,
        initial_message,
      } = req.body;

      if (!event_id || !requesting_org_id || !target_org_id || !collab_type) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'event_id, requesting_org_id, target_org_id, and collab_type are required',
          },
        });
      }

      const collab = await this.service.proposeCollaboration({
        userId: user.id,
        userRoles: user.roles,
        eventId: event_id,
        requestingOrgId: requesting_org_id,
        targetOrgId: target_org_id,
        collabType: collab_type as CollaborationType,
        initialMessage: initial_message || '',
      });

      const response: ApiResponse = {
        success: true,
        message: 'Collaboration proposal submitted successfully',
        data: collab,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCollaborations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const orgId = req.query.org_id as string | undefined;
      const eventId = req.query.event_id as string | undefined;
      const status = req.query.status as CollaborationStatus | undefined;
      const collabType = req.query.collab_type as CollaborationType | undefined;

      const result = await this.service.getCollaborations({
        userId: user.id,
        userRoles: user.roles,
        orgId,
        eventId,
        status,
        collabType,
        page,
        limit,
      });

      const totalPages = Math.ceil(result.total / limit);
      const response: ApiResponse = {
        success: true,
        data: {
          items: result.items,
          meta: {
            page,
            limit,
            total: result.total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const collab = await this.service.getCollaborationById(id, user.id, user.roles);

      const response: ApiResponse = {
        success: true,
        data: collab,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public respond = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { action, message } = req.body;

      if (!action || !['accept', 'reject', 'counter'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Action must be one of: accept, reject, counter',
          },
        });
      }

      const updated = await this.service.respondToCollaboration({
        collaborationId: id,
        userId: user.id,
        userRoles: user.roles,
        action,
        message,
      });

      const response: ApiResponse = {
        success: true,
        message: `Collaboration proposal ${action}ed successfully`,
        data: updated,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { sender_org_id, body, is_counterproposal } = req.body;

      if (!sender_org_id || !body) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'sender_org_id and body are required',
          },
        });
      }

      const message = await this.service.sendMessage({
        collaborationId: id,
        userId: user.id,
        userRoles: user.roles,
        senderOrgId: sender_org_id,
        body,
        isCounterproposal: is_counterproposal,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Message sent successfully',
        data: message,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const workspace = await this.service.getWorkspace(id, user.id, user.roles);

      const response: ApiResponse = {
        success: true,
        data: workspace,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { title, description, assigned_org_id } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Task title is required',
          },
        });
      }

      const task = await this.service.createTask({
        collaborationId: id,
        userId: user.id,
        userRoles: user.roles,
        title,
        description,
        assignedOrgId: assigned_org_id,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Task created successfully',
        data: task,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id, taskId } = req.params;
      const { title, description, assigned_org_id, completed } = req.body;

      const task = await this.service.updateTask({
        collaborationId: id,
        taskId,
        userId: user.id,
        userRoles: user.roles,
        title,
        description,
        assignedOrgId: assigned_org_id,
        completed,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Task updated successfully',
        data: task,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id, taskId } = req.params;

      await this.service.deleteTask({
        collaborationId: id,
        taskId,
        userId: user.id,
        userRoles: user.roles,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Task deleted successfully',
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export const collaborationController = new CollaborationController();
