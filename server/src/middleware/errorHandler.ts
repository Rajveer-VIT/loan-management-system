import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

type FieldError = { rule?: string; field?: string; message: string };

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
}

interface MongoDuplicateKeyError {
  code: 11000;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

/** body-parser tags its errors with `type` ('entity.parse.failed', 'entity.too.large', ...). */
function bodyParserErrorType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && typeof (err as { type?: unknown }).type === 'string') {
    return (err as { type: string }).type;
  }
  return undefined;
}

/** Maps any thrown value to a consistent `{ statusCode, code, message, errors? }` shape. */
function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code ?? (err.statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: err.message,
      errors: err.errors,
    };
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    const value = String(err.keyValue?.[field] ?? '');
    if (field === 'utrNumber') {
      const message = `UTR Number '${value}' has already been recorded for a payment.`;
      return { statusCode: 409, code: 'DUPLICATE_UTR', message, errors: [{ field, message }] };
    }
    if (field === 'email') {
      const message = 'An account with this email already exists.';
      return { statusCode: 409, code: 'DUPLICATE_EMAIL', message, errors: [{ field, message }] };
    }
    return { statusCode: 409, code: 'DUPLICATE_ENTRY', message: 'A conflicting record already exists.' };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'INVALID_ID', message: `Invalid value for '${err.path}'.` };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', errors };
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 400, code: 'FILE_TOO_LARGE', message: 'File size exceeds maximum allowed limit of 5MB.' };
    }
    return { statusCode: 400, code: 'UPLOAD_ERROR', message: err.message };
  }

  const parserType = bodyParserErrorType(err);
  if (parserType === 'entity.parse.failed') {
    return { statusCode: 400, code: 'MALFORMED_JSON', message: 'Request body is not valid JSON.' };
  }
  if (parserType === 'entity.too.large') {
    return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' };
  }

  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal Server Error' };
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const { statusCode, code, message, errors } = toErrorBody(err);

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && { errors }),
  });
};

/** JSON 404 for unknown API routes (instead of Express's default HTML page). */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};
