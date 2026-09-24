import { Request, Response, NextFunction } from "express";
import { outreachService, OutreachService } from "./outreach.service";

export class OutreachController {
  constructor(private readonly service: OutreachService = outreachService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "outreach", status: "initialized" });
  };
}

export const outreachController = new OutreachController();
