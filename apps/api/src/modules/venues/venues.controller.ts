import { Request, Response, NextFunction } from 'express';
import { venuesService, VenuesService } from './venues.service';
import {
  CreateVenueDto,
  CreateVenueRequestDto,
  RespondVenueRequestDto,
  VenueRequestStatus,
} from '@eventops/shared-types';

export class VenuesController {
  constructor(private readonly service: VenuesService = venuesService) {}

  public createVenue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const dto: CreateVenueDto = req.body;
      const result = await this.service.createVenue(userId, dto);
      res.status(201).json({
        success: true,
        message: 'Venue created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getVenueById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getVenueById(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listVenues = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const city = req.query.city as string | undefined;
      const facility = req.query.facility as string | undefined;
      const owner_org_id = req.query.owner_org_id as string | undefined;
      const search = req.query.search as string | undefined;
      const min_capacity = req.query.min_capacity
        ? parseInt(req.query.min_capacity as string, 10)
        : undefined;
      const max_capacity = req.query.max_capacity
        ? parseInt(req.query.max_capacity as string, 10)
        : undefined;

      const result = await this.service.listVenues({
        city,
        facility,
        owner_org_id,
        search,
        min_capacity,
        max_capacity,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createBookingRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const dto: CreateVenueRequestDto = req.body;
      const result = await this.service.createBookingRequest(userId, id, dto);
      res.status(201).json({
        success: true,
        message: 'Venue booking request submitted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listBookingRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const venue_id = req.query.venue_id as string | undefined;
      const event_id = req.query.event_id as string | undefined;
      const requesting_org_id = req.query.requesting_org_id as string | undefined;
      const owner_org_id = req.query.owner_org_id as string | undefined;
      const status = req.query.status as VenueRequestStatus | undefined;

      const result = await this.service.listBookingRequests(userId, {
        venue_id,
        event_id,
        requesting_org_id,
        owner_org_id,
        status,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public respondToBookingRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const dto: RespondVenueRequestDto = req.body;
      const result = await this.service.respondToBookingRequest(userId, id, dto);
      res.status(200).json({
        success: true,
        message: `Venue booking request ${dto.action}ed successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: 'venues', status: 'ready' });
  };
}

export const venuesController = new VenuesController();
