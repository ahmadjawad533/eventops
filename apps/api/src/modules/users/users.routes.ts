import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody, validateQuery } from '../../middleware/validate';
import { updateProfileSchema, assignRoleSchema, paginationQuerySchema } from './users.validation';
import { RoleType } from '@eventops/shared-types';

const router = Router();

router.get('/profile', authenticateJwt, usersController.getProfile);
router.put('/profile', authenticateJwt, validateBody(updateProfileSchema), usersController.updateProfile);
router.post('/roles', authenticateJwt, validateBody(assignRoleSchema), usersController.assignRole);
router.get(
  '/',
  authenticateJwt,
  requireRole(RoleType.PLATFORM_ADMIN, RoleType.ORGANIZER),
  validateQuery(paginationQuerySchema),
  usersController.listUsers
);

export const usersRoutes = router;
