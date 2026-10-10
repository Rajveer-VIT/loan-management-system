import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  errors?: Array<{ rule?: string; field?: string; message: string }>;
  keyValue?: Record<string, string>;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  let errors = err.errors || undefined;

  // Mongo E11000 Duplicate Key Error (e.g. UTR or Email)
  if (err.code === 11000 || err.code === '11000') {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';

    if (field === 'utrNumber') {
      code = 'DUPLICATE_UTR';
      message = `UTR Number '${value}' has already been recorded for a payment.`;
    } else if (field === 'email') {
      code = 'DUPLICATE_EMAIL';
      message = `An account with email '${value}' already exists.`;
    } else {
      code = 'DUPLICATE_ENTRY';
      message = `Duplicate entry for ${field}: '${value}'.`;
    }

    errors = [{ field, message }];
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    code = 'FILE_TOO_LARGE';
    message = 'File size exceeds maximum allowed limit of 5MB.';
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('💥 UNHANDLED ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && { errors }),
  });
};
