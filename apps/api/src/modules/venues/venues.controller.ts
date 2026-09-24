import { Request, Response, NextFunction } from "express";
import { venuesService, VenuesService } from "./venues.service";

export class VenuesController {
  constructor(private readonly service: VenuesService = venuesService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "venues", status: "initialized" });
  };
}

export const venuesController = new VenuesController();
