import { collaborationRepository, CollaborationRepository } from "./collaboration.repository";

export class CollaborationService {
  constructor(private readonly repo: CollaborationRepository = collaborationRepository) {}
}

export const collaborationService = new CollaborationService();
