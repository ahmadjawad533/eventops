import { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from './auth.service';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.body.refreshToken || (req.headers['x-refresh-token'] as string);
      const result = await this.service.refreshToken(token);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getCurrentUser(userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  };
}

export const authController = new AuthController();
