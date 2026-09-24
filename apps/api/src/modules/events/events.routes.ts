import { Router } from 'express';
import { eventsController } from './events.controller';
import { authenticateJwt } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createEventSchema,
  updateEventSchema,
  checkInSchema,
  eventListQuerySchema,
} from './events.validation';

const router = Router();

router.post('/', authenticateJwt, validateBody(createEventSchema), eventsController.create);
router.get('/', validateQuery(eventListQuerySchema), eventsController.list);
router.get('/registrations/my', authenticateJwt, eventsController.getMyRegistrations);
router.get('/:id', eventsController.getById);
router.put('/:id', authenticateJwt, validateBody(updateEventSchema), eventsController.update);
router.patch('/:id/publish', authenticateJwt, eventsController.publish);
router.post('/:id/register', authenticateJwt, eventsController.register);
router.post('/:id/check-in', authenticateJwt, validateBody(checkInSchema), eventsController.checkIn);
router.get('/:id/registrations', authenticateJwt, eventsController.listRegistrations);

// Public certificate verification route under events
router.get('/certificates/verify/:verificationId', eventsController.verifyCertificate);

export const eventsRoutes = router;
