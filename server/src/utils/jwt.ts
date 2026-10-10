import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayloadUser } from '../types/express.js';

const ALGORITHM = 'HS256';

export const signToken = (payload: JwtPayloadUser): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): JwtPayloadUser => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  if (typeof decoded === 'string' || typeof decoded.id !== 'string') {
    throw new Error('Malformed token payload');
  }
  return decoded as unknown as JwtPayloadUser;
};
