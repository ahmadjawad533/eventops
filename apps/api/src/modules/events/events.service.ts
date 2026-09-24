import { eventsRepository, EventsRepository } from "./events.repository";

export class EventsService {
  constructor(private readonly repo: EventsRepository = eventsRepository) {}
}

export const eventsService = new EventsService();
