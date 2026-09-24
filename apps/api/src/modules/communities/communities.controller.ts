import { Request, Response, NextFunction } from 'express';
import { CommunitiesService, communitiesService } from './communities.service';
import { RoleType } from '@eventops/shared-types';

export class CommunitiesController {
  constructor(private readonly service: CommunitiesService = communitiesService) {}

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const search = req.query.search as string;

      const data = await this.service.listCommunities(search, page, limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public follow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.followCommunity(userId, req.params.id);
      res.status(201).json({
        success: true,
        message: 'Followed community successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public unfollow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.unfollowCommunity(userId, req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getFollowerCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getFollowerCount(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorUserId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const data = await this.service.getFollowers(
        actorUserId,
        isPlatformAdmin,
        req.params.id,
        page,
        limit
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

export const communitiesController = new CommunitiesController();
