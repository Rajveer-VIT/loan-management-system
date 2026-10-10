import { Request, Response, NextFunction } from 'express';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

/**
 * Allows the request only when the authenticated user's role is in `allowedRoles`.
 * There is no implicit Admin bypass: routes list ROLES.ADMIN explicitly where Admin
 * should have access (all dashboard modules), and borrower-only routes do not.
 * Returns 401 when unauthenticated and 403 when authenticated without permission.
 */
export const authorize = (allowedRoles: readonly ROLES[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, undefined, 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          403,
          undefined,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
