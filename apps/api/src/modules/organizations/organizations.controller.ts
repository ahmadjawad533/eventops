import { Request, Response, NextFunction } from 'express';
import { OrganizationsService, organizationsService } from './organizations.service';
import { RoleType } from '@eventops/shared-types';

export class OrganizationsController {
  constructor(private readonly service: OrganizationsService = organizationsService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.createOrganization(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getOrganizationById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const type = req.query.type as any;
      const verified = req.query.verified !== undefined ? String(req.query.verified) === 'true' : undefined;
      const search = req.query.search as string;

      const data = await this.service.listOrganizations({
        type,
        verified,
        search,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.updateOrganization(userId, req.params.id, isPlatformAdmin, req.body);
      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = req.user!.id;
      const data = await this.service.verifyOrganization(adminUserId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Organization verification status updated to ${data.verified}`,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public join = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.joinOrganization(userId, req.params.id);
      res.status(201).json({
        success: true,
        message: 'Joined organization successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public leave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.leaveOrganization(userId, req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const data = await this.service.listMembers(req.params.id, page, limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public assignAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorUserId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.assignCommunityAdmin(
        actorUserId,
        isPlatformAdmin,
        req.params.id,
        req.body.user_id
      );
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const organizationsController = new OrganizationsController();
