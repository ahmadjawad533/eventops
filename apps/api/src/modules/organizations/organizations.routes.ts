import { Router } from 'express';
import { organizationsController } from './organizations.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createOrgSchema,
  updateOrgSchema,
  verifyOrgSchema,
  assignAdminSchema,
  orgListQuerySchema,
} from './organizations.validation';
import { RoleType } from '@eventops/shared-types';

const router = Router();

router.post('/', authenticateJwt, validateBody(createOrgSchema), organizationsController.create);
router.get('/', validateQuery(orgListQuerySchema), organizationsController.list);
router.get('/:id', organizationsController.getById);
router.put('/:id', authenticateJwt, validateBody(updateOrgSchema), organizationsController.update);
router.patch(
  '/:id/verify',
  authenticateJwt,
  requireRole(RoleType.PLATFORM_ADMIN),
  validateBody(verifyOrgSchema),
  organizationsController.verify
);
router.post('/:id/join', authenticateJwt, organizationsController.join);
router.delete('/:id/leave', authenticateJwt, organizationsController.leave);
router.get('/:id/members', organizationsController.listMembers);
router.post('/:id/admin', authenticateJwt, validateBody(assignAdminSchema), organizationsController.assignAdmin);

export const organizationsRoutes = router;
