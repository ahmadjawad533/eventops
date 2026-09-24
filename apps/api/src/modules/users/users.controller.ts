import { Request, Response, NextFunction } from 'express';
import { UsersService, usersService } from './users.service';

export class UsersController {
  constructor(private readonly service: UsersService = usersService) {}

  public getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.getProfile(userId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.updateProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public assignRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.assignRole(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Role assigned successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const data = await this.service.listUsers(page, limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();
