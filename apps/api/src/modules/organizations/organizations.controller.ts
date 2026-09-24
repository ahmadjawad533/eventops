import { Request, Response, NextFunction } from "express";
import { organizationsService, OrganizationsService } from "./organizations.service";

export class OrganizationsController {
  constructor(private readonly service: OrganizationsService = organizationsService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "organizations", status: "initialized" });
  };
}

export const organizationsController = new OrganizationsController();
