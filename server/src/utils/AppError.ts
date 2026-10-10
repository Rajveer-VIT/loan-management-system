export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly errors?: Array<{ rule?: string; field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Array<{ rule?: string; field?: string; message: string }>,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
