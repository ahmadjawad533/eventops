import { Router } from 'express';
import { venuesController } from './venues.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/status', venuesController.getStatus);

// Venues
router.post('/', authenticateJwt, venuesController.createVenue);
router.get('/', venuesController.listVenues);
router.get('/requests', authenticateJwt, venuesController.listBookingRequests);
router.get('/:id', venuesController.getVenueById);

// Requests
router.post('/:id/requests', authenticateJwt, venuesController.createBookingRequest);
router.patch('/requests/:id/respond', authenticateJwt, venuesController.respondToBookingRequest);

export const venuesRoutes = router;
