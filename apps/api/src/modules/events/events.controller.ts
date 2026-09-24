import { Request, Response, NextFunction } from 'express';
import { EventsService, eventsService } from './events.service';
import { RoleType } from '@eventops/shared-types';

export class EventsController {
  constructor(private readonly service: EventsService = eventsService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.createEvent(userId, isPlatformAdmin, req.body);
      res.status(201).json({
        success: true,
        message: 'Event created successfully (draft)',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getEventById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const category = req.query.category as any;
      const format = req.query.format as any;
      const status = req.query.status as any;
      const location = req.query.location as string;
      const search = req.query.search as string;
      const organizer_org_id = req.query.organizer_org_id as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.service.listEvents({
        category,
        format,
        status,
        location,
        search,
        startDate,
        endDate,
        organizer_org_id,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.updateEvent(userId, isPlatformAdmin, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.publishEvent(userId, isPlatformAdmin, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Event published successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.registerForEvent(userId, req.params.id);
      res.status(201).json({
        success: true,
        message: 'Registration successful! Your ticket and QR code are ready.',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorUserId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const data = await this.service.checkInAttendee(actorUserId, isPlatformAdmin, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: `Attendee status updated to ${data.registration.status}${data.certificate ? ' and certificate issued' : ''}`,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public listRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorUserId = req.user!.id;
      const isPlatformAdmin = (req.user!.roles || []).includes(RoleType.PLATFORM_ADMIN);
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const data = await this.service.listEventRegistrations(actorUserId, isPlatformAdmin, req.params.id, page, limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMyRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const data = await this.service.getMyRegistrations(userId, page, limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.verifyCertificate(req.params.verificationId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const eventsController = new EventsController();
