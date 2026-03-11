import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AppError } from '../utils/AppError';

/** Extends Express Request with the authenticated user's address */
export interface AuthRequest extends Request {
  user?: { address: string };
}

/**
 * Middleware that verifies a JWT from the Authorization header.
 * Attaches `req.user = { address }` for downstream route handlers.
 *
 * Expected header format: Authorization: Bearer <token>
 */
export const authMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { address: string };
    req.user = { address: decoded.address };
    next();
  } catch {
    return next(new AppError('Invalid or expired token.', 401));
  }
};