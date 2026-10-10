import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Validates `{ body, query, params }` against a zod schema and replaces `req.body` /
 * `req.params` with the parsed output, so controllers receive trimmed, coerced values
 * and any unknown body keys are stripped.
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\.?/, ''),
          message: err.message,
        }));
        return next(new AppError('Validation failed', 400, formattedErrors, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  };
};
