import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (
  schema: z.ZodType,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    // Replace the raw input with the parsed (and potentially transformed) data
    req[source] = result.data;
    next();
  };
};