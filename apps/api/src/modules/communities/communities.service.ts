import { communitiesRepository, CommunitiesRepository } from "./communities.repository";

export class CommunitiesService {
  constructor(private readonly repo: CommunitiesRepository = communitiesRepository) {}
}

export const communitiesService = new CommunitiesService();
