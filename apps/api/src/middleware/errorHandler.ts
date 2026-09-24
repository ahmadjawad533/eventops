import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}: ${message}`, {
      stack: err.stack,
      details: err.details,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || undefined,
    },
  });
}
