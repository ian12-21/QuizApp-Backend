import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import config from '../config';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof AppError ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  if (config.nodeEnv !== 'production') {
    console.error(err.stack);
  }

  res.status(status).json({ error: message });
};
