import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validation';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateJwt, authController.getMe);

export const authRoutes = router;
