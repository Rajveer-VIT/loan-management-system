import { ROLES } from '../constants/roles.js';

export interface JwtPayloadUser {
  id: string;
  email: string;
  role: ROLES;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadUser;
    }
  }
}
