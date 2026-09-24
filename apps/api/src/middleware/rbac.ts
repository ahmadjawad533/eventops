import { Request, Response, NextFunction } from 'express';
import { RoleType } from '@eventops/shared-types';
import { AppError } from './errorHandler';

export function requireRole(...allowedRoles: RoleType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const userRoles = req.user.roles || [];

    // Platform admin has superuser access to all role-restricted routes
    if (userRoles.includes(RoleType.PLATFORM_ADMIN)) {
      return next();
    }

    const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasAllowedRole) {
      return next(
        new AppError(
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current roles: [${userRoles.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
}
