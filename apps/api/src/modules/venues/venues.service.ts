import { venuesRepository, VenuesRepository } from "./venues.repository";

export class VenuesService {
  constructor(private readonly repo: VenuesRepository = venuesRepository) {}
}

export const venuesService = new VenuesService();
