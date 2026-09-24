import { sponsorshipRepository, SponsorshipRepository } from "./sponsorship.repository";

export class SponsorshipService {
  constructor(private readonly repo: SponsorshipRepository = sponsorshipRepository) {}
}

export const sponsorshipService = new SponsorshipService();
