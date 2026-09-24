import { Router } from 'express';
import { collaborationController } from './collaboration.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// All collaboration endpoints require authentication
router.use(authenticateJwt);

// Proposal lifecycle
router.post('/', collaborationController.propose);
router.get('/', collaborationController.getCollaborations);
router.get('/:id', collaborationController.getById);
router.post('/:id/respond', collaborationController.respond);
router.post('/:id/messages', collaborationController.sendMessage);

// Shared workspace (only accessible when collaboration is accepted)
router.get('/:id/workspace', collaborationController.getWorkspace);
router.post('/:id/workspace/tasks', collaborationController.createTask);
router.patch('/:id/workspace/tasks/:taskId', collaborationController.updateTask);
router.delete('/:id/workspace/tasks/:taskId', collaborationController.deleteTask);

export const collaborationRoutes = router;
