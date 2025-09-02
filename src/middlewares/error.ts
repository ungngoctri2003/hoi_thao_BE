import { Request, Response, NextFunction } from 'express';
import { logger } from '../app';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  // Log error for debugging
  logger.error({ 
    error: err, 
    status, 
    message, 
    code,
    stack: err.stack,
    url: req.url,
    method: req.method
  }, 'Request error');

  res.status(status).json({
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
