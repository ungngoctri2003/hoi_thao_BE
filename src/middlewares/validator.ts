import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../app';

export function validate(schema: ZodSchema<unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse({ 
        body: req.body, 
        query: req.query, 
        params: req.params 
      });
      
      if (!result.success) {
        const error = result.error as ZodError;
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        res.status(400).json({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data', 
            details: formattedErrors 
          } 
        });
        return;
      }
      
      // Attach validated data to request
      req.validatedData = result.data;
      next();
    } catch (error) {
      logger.error({ error }, 'Validation middleware error');
      res.status(500).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Validation service error' 
        } 
      });
    }
  };
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      validatedData?: unknown;
    }
  }
}




