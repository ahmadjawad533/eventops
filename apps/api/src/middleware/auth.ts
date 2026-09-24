import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtUserPayload } from '../core/auth.utils';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export function authenticateJwt(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
  }
}
