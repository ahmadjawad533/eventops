import { Request, Response, NextFunction } from 'express';
import { dashboardsService, DashboardsService } from './dashboards.service';

export class DashboardsController {
  constructor(private readonly service: DashboardsService = dashboardsService) {}

  public getOrganizerDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const orgId = req.query.org_id as string | undefined;
      const metrics = await this.service.getOrganizerDashboard(userId, orgId);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCommunityDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const orgId = req.query.org_id as string | undefined;
      const metrics = await this.service.getCommunityDashboard(userId, orgId);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAuditLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const action = req.query.action as string | undefined;
      const target_type = req.query.target_type as string | undefined;
      const target_id = req.query.target_id as string | undefined;
      const actor_user_id = req.query.actor_user_id as string | undefined;

      const result = await this.service.getAuditLogs(userId, {
        action,
        target_type,
        target_id,
        actor_user_id,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardsController = new DashboardsController();
