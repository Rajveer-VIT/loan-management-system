import { Request, Response, NextFunction } from 'express';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

export const authorize = (...allowedRoles: ROLES[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // ADMIN always passes every authorize check
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
    }

    next();
  };
};
