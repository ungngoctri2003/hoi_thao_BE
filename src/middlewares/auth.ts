import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { usersRepository } from '../modules/users/users.repository';
import { logger } from '../app';

export type AuthUser = {
  id: number;
  email: string;
  permissions?: string[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function auth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Missing or invalid authorization header. Use format: Bearer <token>' 
          } 
        });
        return;
      }
      
      const token = header.slice('Bearer '.length);
      if (!token) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Token is required' 
          } 
        });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthUser;
      if (!decoded || !decoded.id || !decoded.email) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid token format' 
          } 
        });
        return;
      }

      const perms = await usersRepository.getPermissions(decoded.id);
      req.user = { ...decoded, permissions: perms };
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid or expired token' 
          } 
        });
        return;
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ 
          error: { 
            code: 'TOKEN_EXPIRED', 
            message: 'Token has expired' 
          } 
        });
        return;
      }

      logger.error({ error }, 'Auth middleware error');
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Authentication service error' 
        } 
      });
    }
  };
}


