import { Router } from 'express';
import { healthRoutes } from './health/health.routes';
import { authRoutes } from './auth/auth.routes';
import { usersRoutes } from './users/users.routes';
import { organizationsRoutes } from './organizations/organizations.routes';
import { communitiesRoutes } from './communities/communities.routes';
import { eventsRoutes } from './events/events.routes';
import { collaborationRoutes } from './collaboration/collaboration.routes';
import { outreachRoutes } from './outreach/outreach.routes';
import { sponsorshipRoutes } from './sponsorship/sponsorship.routes';
import { venuesRoutes } from './venues/venues.routes';
import { notificationsRoutes } from './notifications/notifications.routes';

import { eventsController } from './events/events.controller';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/organizations', organizationsRoutes);
apiRouter.use('/communities', communitiesRoutes);
apiRouter.use('/events', eventsRoutes);
apiRouter.get('/certificates/verify/:verificationId', eventsController.verifyCertificate);
apiRouter.use('/collaboration', collaborationRoutes);
apiRouter.use('/outreach', outreachRoutes);
apiRouter.use('/sponsorship', sponsorshipRoutes);
apiRouter.use('/venues', venuesRoutes);
apiRouter.use('/notifications', notificationsRoutes);

export { apiRouter };
