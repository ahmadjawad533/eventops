import { Request, Response, NextFunction } from "express";
import { sponsorshipService, SponsorshipService } from "./sponsorship.service";

export class SponsorshipController {
  constructor(private readonly service: SponsorshipService = sponsorshipService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "sponsorship", status: "initialized" });
  };
}

export const sponsorshipController = new SponsorshipController();
