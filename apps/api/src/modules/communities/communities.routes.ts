import { Router } from 'express';
import { communitiesController } from './communities.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/', communitiesController.list);
router.post('/:id/follow', authenticateJwt, communitiesController.follow);
router.delete('/:id/follow', authenticateJwt, communitiesController.unfollow);
router.get('/:id/followers/count', communitiesController.getFollowerCount);
router.get('/:id/followers', authenticateJwt, communitiesController.getFollowers);

export const communitiesRoutes = router;
