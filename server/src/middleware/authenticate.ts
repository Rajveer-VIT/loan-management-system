import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.model.js';

/**
 * Verifies the Bearer JWT, then loads the user from the database so that the role and
 * active flag used for authorization always come from server-side state, never from
 * claims that might be stale (role changed / account deactivated after token issue).
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('Authentication required. Missing or malformed token.', 401, undefined, 'UNAUTHENTICATED')
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();

  let userId: string;
  try {
    userId = verifyToken(token).id;
  } catch {
    return next(new AppError('Invalid or expired token. Please log in again.', 401, undefined, 'INVALID_TOKEN'));
  }

  try {
    const user = await User.findById(userId).select('name email role isActive').lean();
    if (!user || !user.isActive) {
      return next(new AppError('Account not found or inactive. Please log in again.', 401, undefined, 'INVALID_TOKEN'));
    }

    req.user = { id: user._id.toString(), email: user.email, role: user.role, name: user.name };
    next();
  } catch (error) {
    next(error);
  }
};
