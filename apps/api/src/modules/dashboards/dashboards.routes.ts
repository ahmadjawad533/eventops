import { Router } from 'express';
import { dashboardsController } from './dashboards.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/organizer', authenticateJwt, dashboardsController.getOrganizerDashboard);
router.get('/community', authenticateJwt, dashboardsController.getCommunityDashboard);
router.get('/audit-logs', authenticateJwt, dashboardsController.getAuditLogs);
router.get('/', authenticateJwt, dashboardsController.getAuditLogs);

export const dashboardsRoutes = router;
