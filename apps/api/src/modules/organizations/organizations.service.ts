import { organizationsRepository, OrganizationsRepository } from "./organizations.repository";

export class OrganizationsService {
  constructor(private readonly repo: OrganizationsRepository = organizationsRepository) {}
}

export const organizationsService = new OrganizationsService();
