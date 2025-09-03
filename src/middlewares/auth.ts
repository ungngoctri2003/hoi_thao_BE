import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { usersRepository } from '../modules/users/users.repository';
import { logger } from '../app';

export type AuthUser = {
  id: number;
  email: string;
  name?: string;
  role?: string;
  status?: string;
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

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
      if (!decoded || !decoded.id || !decoded.email) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid token format' 
          } 
        });
        return;
      }

      // Ensure id is a number
      const userId = Number(decoded.id);
      if (isNaN(userId)) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid user ID in token' 
          } 
        });
        return;
      }

      // Get full user information including role and status
      const user = await usersRepository.findById(userId);
      if (!user) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'User not found' 
          } 
        });
        return;
      }

      // Check if user is active
      if (user.STATUS && user.STATUS !== 'active') {
        res.status(401).json({ 
          error: { 
            code: 'ACCOUNT_DISABLED', 
            message: 'Account is disabled' 
          } 
        });
        return;
      }

      const perms = await usersRepository.getPermissions(userId);
      const userRoles = await usersRepository.listRoles(userId);
      const primaryRole = userRoles.length > 0 ? userRoles[0].CODE : 'attendee';
      
      req.user = { 
        id: userId, 
        email: decoded.email, 
        name: user.NAME,
        role: primaryRole,
        status: user.STATUS || 'active',
        permissions: perms 
      };
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


