import { Request, Response, NextFunction } from 'express';

export function rbac(...requiredPerms: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }

      const userPerms: string[] = req.user.permissions || [];
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPerms.every(perm => userPerms.includes(perm));
      
      if (!hasAllPermissions) {
        const missingPerms = requiredPerms.filter(perm => !userPerms.includes(perm));
        
        return res.status(403).json({ 
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
      }
      
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ 
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
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          } 
        });
      }

      const userPerms: string[] = req.user.permissions || [];
      const hasAnyPermission = requiredPerms.some(perm => userPerms.includes(perm));
      
      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions', 
            details: {
              required: requiredPerms,
              userPermissions: userPerms
            }
          } 
        });
      }
      
      next();
    } catch (error) {
      console.error('RBAC Any middleware error:', error);
      return res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Permission check failed' 
        } 
      });
    }
  };
}




