import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayloadUser } from '../types/express.js';

export const signToken = (payload: JwtPayloadUser): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string): JwtPayloadUser => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayloadUser;
};
