import { Request, Response, NextFunction } from 'express';
import { logger } from '../app';
import { userConferenceAssignmentsRepository } from '../modules/user-conference-assignments/user-conference-assignments.repository';

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

// Conference-specific RBAC middleware
export function conferenceRBAC(permission: string, conferenceIdParam: string = 'conferenceId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin users have access to all conferences
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Get conference ID from request parameters
      const conferenceId = req.params[conferenceIdParam];
      if (!conferenceId) {
        res.status(400).json({
          success: false,
          message: 'Conference ID is required'
        });
        return;
      }

      // Check if user has permission for this specific conference
      const hasPermission = await userConferenceAssignmentsRepository.checkUserConferencePermission(
        req.user.id,
        Number(conferenceId),
        permission
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${permission} for this conference.`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Conference RBAC middleware error');
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

// Conference-specific RBAC middleware for multiple permissions (user needs any)
export function conferenceRBACAny(permissions: string[], conferenceIdParam: string = 'conferenceId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin users have access to all conferences
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Get conference ID from request parameters
      const conferenceId = req.params[conferenceIdParam];
      if (!conferenceId) {
        res.status(400).json({
          success: false,
          message: 'Conference ID is required'
        });
        return;
      }

      // Check if user has any of the required permissions for this specific conference
      let hasAnyPermission = false;
      for (const permission of permissions) {
        const hasPermission = await userConferenceAssignmentsRepository.checkUserConferencePermission(
          req.user.id,
          Number(conferenceId),
          permission
        );
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          message: `Access denied. You don't have any of the required permissions for this conference.`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Conference RBAC Any middleware error');
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}




