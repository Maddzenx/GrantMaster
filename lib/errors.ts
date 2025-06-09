/**
 * Custom error classes for API and application errors.
 *
 * Usage:
 *   throw new ValidationError('Invalid input', { field: 'email' });
 *   throw new ExternalServiceError('Failed to fetch', { service: 'Stripe' }, err);
 */

export enum ErrorCode {
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
}

export interface ErrorContext {
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  context?: ErrorContext;
  cause?: unknown;
  constructor(message: string, status: number, code: ErrorCode, context?: ErrorContext, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.context = context;
    this.cause = cause;
    Error.captureStackTrace?.(this, this.constructor);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 400, ErrorCode.VALIDATION, context, cause);
  }
}

export class AuthError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 401, ErrorCode.AUTH, context, cause);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 404, ErrorCode.NOT_FOUND, context, cause);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 429, ErrorCode.RATE_LIMIT, context, cause);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 500, ErrorCode.INTERNAL, context, cause);
  }
}

export class ExternalServiceError extends ApiError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super(message, 502, ErrorCode.EXTERNAL_SERVICE, context, cause);
  }
} 