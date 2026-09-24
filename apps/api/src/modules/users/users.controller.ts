import { Request, Response, NextFunction } from "express";
import { usersService, UsersService } from "./users.service";

export class UsersController {
  constructor(private readonly service: UsersService = usersService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "users", status: "initialized" });
  };
}

export const usersController = new UsersController();
