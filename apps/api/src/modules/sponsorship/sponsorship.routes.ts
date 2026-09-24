import { Router } from 'express';
import { sponsorshipController } from './sponsorship.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/status', sponsorshipController.getStatus);

// Opportunities
router.post('/opportunities', authenticateJwt, sponsorshipController.createOpportunity);
router.get('/opportunities', sponsorshipController.listOpportunities);
router.get('/opportunities/:id', sponsorshipController.getOpportunityById);

// Applications
router.post('/opportunities/:id/apply', authenticateJwt, sponsorshipController.applyToOpportunity);
router.get('/opportunities/:id/applications', authenticateJwt, sponsorshipController.listApplications);
router.get('/applications', authenticateJwt, sponsorshipController.listApplications);
router.patch('/applications/:id/status', authenticateJwt, sponsorshipController.updateApplicationStatus);

export const sponsorshipRoutes = router;
