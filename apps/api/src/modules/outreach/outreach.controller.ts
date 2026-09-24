import { Request, Response, NextFunction } from 'express';
import { outreachService, OutreachService } from './outreach.service';
import { OutreachStatus, ApiResponse } from '@eventops/shared-types';

export class OutreachController {
  constructor(private readonly service: OutreachService = outreachService) {}

  public submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const {
        requesting_org_id,
        target_community_org_id,
        event_id,
        purpose,
        target_audience,
        requested_recipient_count,
        message_subject,
        message_body,
      } = req.body;

      if (
        !requesting_org_id ||
        !target_community_org_id ||
        !event_id ||
        !purpose ||
        !target_audience ||
        !message_subject ||
        !message_body
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All fields (requesting_org_id, target_community_org_id, event_id, purpose, target_audience, message_subject, message_body) are required',
          },
        });
      }

      const outreachReq = await this.service.submitOutreachRequest({
        userId: user.id,
        userRoles: user.roles,
        requestingOrgId: requesting_org_id,
        targetCommunityOrgId: target_community_org_id,
        eventId: event_id,
        purpose,
        targetAudience: target_audience,
        requestedRecipientCount: Number(requested_recipient_count) || 50,
        messageSubject: message_subject,
        messageBody: message_body,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Outreach request submitted to community admin review queue',
        data: outreachReq,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const requestingOrgId = req.query.requesting_org_id as string | undefined;
      const targetCommunityOrgId = req.query.target_community_org_id as string | undefined;
      const eventId = req.query.event_id as string | undefined;
      const status = req.query.status as OutreachStatus | undefined;

      const result = await this.service.getOutreachRequests({
        userId: user.id,
        userRoles: user.roles,
        requestingOrgId,
        targetCommunityOrgId,
        eventId,
        status,
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

      const outreachReq = await this.service.getOutreachRequestById(id, user.id, user.roles);

      const response: ApiResponse = {
        success: true,
        data: outreachReq,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public review = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { action, message_subject, message_body, notes } = req.body;

      if (!action || !['approve', 'approve_with_edits', 'reject', 'needs_info'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Action must be one of: approve, approve_with_edits, reject, needs_info',
          },
        });
      }

      const updated = await this.service.reviewOutreachRequest({
        requestId: id,
        userId: user.id,
        userRoles: user.roles,
        action,
        messageSubject: message_subject,
        messageBody: message_body,
        notes,
      });

      const response: ApiResponse = {
        success: true,
        message: `Outreach request ${action}ed successfully`,
        data: updated,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public getCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const metrics = await this.service.getCampaignMetrics(id, user.id, user.roles);

      const response: ApiResponse = {
        success: true,
        data: metrics,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public simulateActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { opens, clicks, registrations } = req.body;

      const updated = await this.service.simulateActivity({
        requestId: id,
        userId: user.id,
        userRoles: user.roles,
        opens: Number(opens) || 0,
        clicks: Number(clicks) || 0,
        registrations: Number(registrations) || 0,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Campaign engagement metrics updated',
        data: updated,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

export const outreachController = new OutreachController();
