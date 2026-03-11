import { Router, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import {
  nonceQuerySchema,
  loginBodySchema,
  updateProfileBodySchema,
} from '../validators/authValidator';

export const createAuthRouter = (authService: AuthService): Router => {
  const router = Router();

  /**
   * GET /api/auth/nonce?address=0x...
   * Returns a fresh nonce for the given address to sign.
   * Creates the user record if it doesn't exist yet.
   */
  router.get(
    '/auth/nonce',
    validate(nonceQuerySchema, 'query'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { address } = req.query as { address: string };
        const result = await authService.getNonce(address);
        return res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * POST /api/auth/login
   * Verifies a wallet signature and returns a JWT + user profile.
   */
  router.post(
    '/auth/login',
    validate(loginBodySchema, 'body'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { address, signature, message } = req.body;
        const result = await authService.login(address, signature, message);
        return res.json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/user/profile
   * Returns the authenticated user's profile. Requires JWT.
   */
  router.get(
    '/user/profile',
    authMiddleware,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const profile = await authService.getProfile(req.user!.address);
        return res.json(profile);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * PUT /api/user/profile
   * Updates the authenticated user's nickname and/or display preference.
   * Requires JWT.
   */
  router.put(
    '/user/profile',
    authMiddleware,
    validate(updateProfileBodySchema, 'body'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const { nickname, displayPreference } = req.body;
        const profile = await authService.updateProfile(req.user!.address, {
          nickname,
          displayPreference,
        });
        return res.json(profile);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};