import { Router } from 'express';
import { outreachController } from './outreach.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// All outreach endpoints require authentication
router.use(authenticateJwt);

// Outreach requests lifecycle
router.post('/', outreachController.submit);
router.get('/', outreachController.getRequests);
router.get('/:id', outreachController.getById);
router.patch('/:id/review', outreachController.review);

// Aggregated campaign metrics & activity simulation
router.get('/:id/campaign', outreachController.getCampaign);
router.post('/:id/simulate-activity', outreachController.simulateActivity);

export const outreachRoutes = router;
