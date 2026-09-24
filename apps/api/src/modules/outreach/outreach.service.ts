import { outreachRepository, OutreachRepository } from "./outreach.repository";

export class OutreachService {
  constructor(private readonly repo: OutreachRepository = outreachRepository) {}
}

export const outreachService = new OutreachService();
