import { notificationsRepository, NotificationsRepository } from "./notifications.repository";

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository = notificationsRepository) {}
}

export const notificationsService = new NotificationsService();
