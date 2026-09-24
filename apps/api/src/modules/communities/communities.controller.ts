import { Request, Response, NextFunction } from "express";
import { communitiesService, CommunitiesService } from "./communities.service";

export class CommunitiesController {
  constructor(private readonly service: CommunitiesService = communitiesService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "communities", status: "initialized" });
  };
}

export const communitiesController = new CommunitiesController();
