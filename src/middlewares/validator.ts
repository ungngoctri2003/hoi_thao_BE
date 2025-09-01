import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({ 
        body: req.body, 
        query: req.query, 
        params: req.params 
      });
      
      if (!result.success) {
        const error = result.error as ZodError;
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data', 
            details: formattedErrors 
          } 
        });
      }
      
      // Attach validated data to request
      req.validatedData = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({ 
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
      validatedData?: any;
    }
  }
}




