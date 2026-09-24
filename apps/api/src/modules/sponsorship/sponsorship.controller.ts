import { Request, Response, NextFunction } from 'express';
import { sponsorshipService, SponsorshipService } from './sponsorship.service';
import {
  CreateSponsorshipOpportunityDto,
  ApplySponsorshipDto,
  UpdateSponsorshipApplicationStatusDto,
  SponsorshipStatus,
} from '@eventops/shared-types';

export class SponsorshipController {
  constructor(private readonly service: SponsorshipService = sponsorshipService) {}

  public createOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const dto: CreateSponsorshipOpportunityDto = req.body;
      const result = await this.service.createOpportunity(userId, dto);
      res.status(201).json({
        success: true,
        message: 'Sponsorship opportunity created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getOpportunityById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getOpportunityById(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listOpportunities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const event_id = req.query.event_id as string | undefined;
      const search = req.query.search as string | undefined;
      const budget_range = req.query.budget_range as string | undefined;

      const result = await this.service.listOpportunities({
        event_id,
        search,
        budget_range,
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

  public applyToOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const dto: ApplySponsorshipDto = req.body;
      const result = await this.service.applyToOpportunity(userId, id, dto);
      res.status(201).json({
        success: true,
        message: 'Sponsorship application submitted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const opportunity_id = (req.params.id || req.query.opportunity_id) as string | undefined;
      const sponsor_org_id = req.query.sponsor_org_id as string | undefined;
      const status = req.query.status as SponsorshipStatus | undefined;

      const result = await this.service.listApplications(userId, {
        opportunity_id,
        sponsor_org_id,
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

  public updateApplicationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const dto: UpdateSponsorshipApplicationStatusDto = req.body;
      const result = await this.service.updateApplicationStatus(userId, id, dto);
      res.status(200).json({
        success: true,
        message: 'Sponsorship application status updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getStatus = async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ module: 'sponsorship', status: 'ready' });
  };
}

export const sponsorshipController = new SponsorshipController();
