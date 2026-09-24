import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "auth", status: "initialized" });
  };
}

export const authController = new AuthController();
