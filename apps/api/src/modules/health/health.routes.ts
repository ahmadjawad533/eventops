import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();

router.get('/', HealthController.getHealth);
router.get('/ready', HealthController.getReadiness);

export const healthRoutes = router;
