import { Request, Response, NextFunction } from "express";
import { eventsService, EventsService } from "./events.service";

export class EventsController {
  constructor(private readonly service: EventsService = eventsService) {}

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: "events", status: "initialized" });
  };
}

export const eventsController = new EventsController();
