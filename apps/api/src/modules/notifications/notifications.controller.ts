import { Request, Response, NextFunction } from "express";
import { notificationsService, NotificationsService } from "./notifications.service";

export class NotificationsController {
  constructor(private readonly service: NotificationsService = notificationsService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "notifications", status: "initialized" });
  };
}

export const notificationsController = new NotificationsController();
