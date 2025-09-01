import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { usersRepository } from '../modules/users/users.repository';

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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Missing or invalid authorization header. Use format: Bearer <token>' 
          } 
        });
      }
      
      const token = header.slice('Bearer '.length);
      if (!token) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Token is required' 
          } 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthUser;
      if (!decoded || !decoded.id || !decoded.email) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid token format' 
          } 
        });
      }

      const perms = await usersRepository.getPermissions(decoded.id);
      req.user = { ...decoded, permissions: perms };
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid or expired token' 
          } 
        });
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          error: { 
            code: 'TOKEN_EXPIRED', 
            message: 'Token has expired' 
          } 
        });
      }

      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Authentication service error' 
        } 
      });
    }
  };
}


