import { Request, Response, NextFunction } from 'express';
import { logger } from '../app';

export function rbac(...requiredPerms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
        return;
      }

      const userPerms: string[] = req.user.permissions || [];
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPerms.every(perm => userPerms.includes(perm));
      
      if (!hasAllPermissions) {
        const missingPerms = requiredPerms.filter(perm => !userPerms.includes(perm));
        
        res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions', 
            details: {
              required: requiredPerms,
              missing: missingPerms,
              userPermissions: userPerms
            }
          } 
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error({ error }, 'RBAC middleware error');
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Permission check failed' 
        } 
      });
    }
  };
}

// Helper function for checking if user has any of the required permissions
export function rbacAny(...requiredPerms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
        return;
      }

      const userPerms: string[] = req.user.permissions || [];
      const hasAnyPermission = requiredPerms.some(perm => userPerms.includes(perm));
      
      if (!hasAnyPermission) {
        res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions', 
            details: {
              required: requiredPerms,
              userPermissions: userPerms
            }
          } 
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error({ error }, 'RBAC Any middleware error');
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Permission check failed' 
        } 
      });
    }
  };
}




