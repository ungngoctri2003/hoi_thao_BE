import { Request, Response, NextFunction } from 'express';
import { userConferenceAssignmentsRepository } from '../modules/user-conference-assignments/user-conference-assignments.repository';

export interface ConferenceRBACRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/**
 * Middleware to check if user has permission for a specific conference
 * @param permission - The permission to check (e.g., 'conferences.view', 'conferences.update')
 * @param conferenceIdParam - The parameter name that contains the conference ID (default: 'conferenceId')
 */
export function conferenceRBAC(permission: string, conferenceIdParam: string = 'conferenceId') {
  return async (req: ConferenceRBACRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin users have access to all conferences
      if (req.user.role === 'admin') {
        return next();
      }

      // Get conference ID from request parameters
      const conferenceId = req.params[conferenceIdParam];
      if (!conferenceId) {
        return res.status(400).json({
          success: false,
          message: 'Conference ID is required'
        });
      }

      // Check if user has permission for this specific conference
      const hasPermission = await userConferenceAssignmentsRepository.checkUserConferencePermission(
        req.user.id,
        Number(conferenceId),
        permission
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${permission} for this conference.`
        });
      }

      next();
    } catch (error) {
      console.error('Conference RBAC error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to check if user has any permission for a specific conference
 * @param permissions - Array of permissions to check (user needs at least one)
 * @param conferenceIdParam - The parameter name that contains the conference ID (default: 'conferenceId')
 */
export function conferenceRBACAny(permissions: string[], conferenceIdParam: string = 'conferenceId') {
  return async (req: ConferenceRBACRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin users have access to all conferences
      if (req.user.role === 'admin') {
        return next();
      }

      // Get conference ID from request parameters
      const conferenceId = req.params[conferenceIdParam];
      if (!conferenceId) {
        return res.status(400).json({
          success: false,
          message: 'Conference ID is required'
        });
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
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have any of the required permissions for this conference.`
        });
      }

      next();
    } catch (error) {
      console.error('Conference RBAC error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to check if user has all permissions for a specific conference
 * @param permissions - Array of permissions to check (user needs all)
 * @param conferenceIdParam - The parameter name that contains the conference ID (default: 'conferenceId')
 */
export function conferenceRBACAll(permissions: string[], conferenceIdParam: string = 'conferenceId') {
  return async (req: ConferenceRBACRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin users have access to all conferences
      if (req.user.role === 'admin') {
        return next();
      }

      // Get conference ID from request parameters
      const conferenceId = req.params[conferenceIdParam];
      if (!conferenceId) {
        return res.status(400).json({
          success: false,
          message: 'Conference ID is required'
        });
      }

      // Check if user has all required permissions for this specific conference
      let hasAllPermissions = true;
      for (const permission of permissions) {
        const hasPermission = await userConferenceAssignmentsRepository.checkUserConferencePermission(
          req.user.id,
          Number(conferenceId),
          permission
        );
        if (!hasPermission) {
          hasAllPermissions = false;
          break;
        }
      }

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have all required permissions for this conference.`
        });
      }

      next();
    } catch (error) {
      console.error('Conference RBAC error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to get user's conference assignments and add them to request
 * This is useful for endpoints that need to know which conferences a user can access
 */
export function getUserConferenceAssignments(req: ConferenceRBACRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin users can access all conferences, so we don't need to check assignments
  if (req.user.role === 'admin') {
    (req as any).conferenceAssignments = null; // null means access to all
    return next();
  }

  // Get user's conference assignments
  userConferenceAssignmentsRepository.findByUserId(req.user.id)
    .then(assignments => {
      (req as any).conferenceAssignments = assignments;
      next();
    })
    .catch(error => {
      console.error('Error getting user conference assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
}
