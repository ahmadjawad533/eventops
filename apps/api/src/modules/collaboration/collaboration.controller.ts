import { Request, Response, NextFunction } from "express";
import { collaborationService, CollaborationService } from "./collaboration.service";

export class CollaborationController {
  constructor(private readonly service: CollaborationService = collaborationService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "collaboration", status: "initialized" });
  };
}

export const collaborationController = new CollaborationController();
