import { Request, Response, NextFunction } from 'express';
import { userConferenceAssignmentsRepository } from './user-conference-assignments.repository';
import { conferencesRepository } from '../conferences/conferences.repository';
import { usersRepository } from '../users/users.repository';
import { logger } from '../../app';

export class UserConferenceAssignmentsController {
  // Get all assignments with pagination and filters
  async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 50, userId, conferenceId, isActive } = req.query;
      
      const result = await userConferenceAssignmentsRepository.listAll({
        page: Number(page),
        limit: Number(limit),
        userId: userId ? Number(userId) : undefined,
        conferenceId: conferenceId ? Number(conferenceId) : undefined,
        isActive: isActive ? Number(isActive) : undefined
      });

      // Debug: Log the data structure
      console.log('Result data type:', typeof result.data);
      console.log('Result data length:', result.data?.length);
      if (result.data && result.data.length > 0) {
        console.log('First item keys:', Object.keys(result.data[0]));
        console.log('First item type:', typeof result.data[0]);
      }
      
      // Manually clean the data to avoid circular references
      const cleanData = result.data.map((item: any) => {
        const cleanItem = {
          id: item.ID,
          userId: item.USER_ID,
          conferenceId: item.CONFERENCE_ID,
          permissions: item.PERMISSIONS,
          assignedBy: item.ASSIGNED_BY,
          assignedAt: item.ASSIGNED_AT,
          isActive: item.IS_ACTIVE,
          createdAt: item.CREATED_AT,
          updatedAt: item.UPDATED_AT,
          userName: item.USER_NAME,
          userEmail: item.USER_EMAIL,
          conferenceName: item.CONFERENCE_NAME
        };
        return cleanItem;
      });
      
      res.json({
        success: true,
        data: cleanData,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(result.total / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get assignments for a specific user
  async getUserAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const assignments = await userConferenceAssignmentsRepository.findByUserId(Number(userId));
      
      // Clean the data to avoid circular references with deep serialization
      const cleanAssignments = assignments.map((assignment: any) => {
        const cleanAssignment = {
          id: Number(assignment.ID || assignment.id || 0),
          userId: Number(assignment.USER_ID || assignment.userId || 0),
          conferenceId: Number(assignment.CONFERENCE_ID || assignment.conferenceId || 0),
          permissions: assignment.PERMISSIONS || assignment.permissions || {},
          assignedBy: Number(assignment.ASSIGNED_BY || assignment.assignedBy || 0),
          assignedAt: String(assignment.ASSIGNED_AT || assignment.assignedAt || ''),
          isActive: Number(assignment.IS_ACTIVE || assignment.isActive || 0),
          createdAt: String(assignment.CREATED_AT || assignment.createdAt || ''),
          updatedAt: String(assignment.UPDATED_AT || assignment.updatedAt || ''),
          userName: String(assignment.USER_NAME || assignment.userName || ''),
          userEmail: String(assignment.USER_EMAIL || assignment.userEmail || ''),
          conferenceName: String(assignment.CONFERENCE_NAME || assignment.conferenceName || '')
        };
        return JSON.parse(JSON.stringify(cleanAssignment));
      });
      
      res.json({
        success: true,
        data: cleanAssignments
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user's own assignments (no admin permission required)
  async getMyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const assignments = await userConferenceAssignmentsRepository.findByUserId(Number(userId));
      
      // Clean the data to avoid circular references with deep serialization
      const cleanAssignments = assignments.map((assignment: any) => {
        const cleanAssignment = {
          id: Number(assignment.ID || assignment.id || 0),
          userId: Number(assignment.USER_ID || assignment.userId || 0),
          conferenceId: Number(assignment.CONFERENCE_ID || assignment.conferenceId || 0),
          permissions: assignment.PERMISSIONS || assignment.permissions || {},
          assignedBy: Number(assignment.ASSIGNED_BY || assignment.assignedBy || 0),
          assignedAt: String(assignment.ASSIGNED_AT || assignment.assignedAt || ''),
          isActive: Number(assignment.IS_ACTIVE || assignment.isActive || 0),
          createdAt: String(assignment.CREATED_AT || assignment.createdAt || ''),
          updatedAt: String(assignment.UPDATED_AT || assignment.updatedAt || ''),
          userName: String(assignment.USER_NAME || assignment.userName || ''),
          userEmail: String(assignment.USER_EMAIL || assignment.userEmail || ''),
          conferenceName: String(assignment.CONFERENCE_NAME || assignment.conferenceName || '')
        };
        return JSON.parse(JSON.stringify(cleanAssignment));
      });
      
      res.json({
        success: true,
        data: cleanAssignments
      });
    } catch (error) {
      next(error);
    }
  }

  // Get assignments for a specific conference
  async getConferenceAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { conferenceId } = req.params;
      const assignments = await userConferenceAssignmentsRepository.findByConferenceId(Number(conferenceId));
      
      // Clean the data to avoid circular references with deep serialization
      const cleanAssignments = assignments.map((assignment: any) => {
        // Create a completely new object with only the data we need
        const cleanAssignment = {
          id: Number(assignment.ID || assignment.id || 0),
          userId: Number(assignment.USER_ID || assignment.userId || 0),
          conferenceId: Number(assignment.CONFERENCE_ID || assignment.conferenceId || 0),
          permissions: assignment.PERMISSIONS || assignment.permissions || {},
          assignedBy: Number(assignment.ASSIGNED_BY || assignment.assignedBy || 0),
          assignedAt: String(assignment.ASSIGNED_AT || assignment.assignedAt || ''),
          isActive: Number(assignment.IS_ACTIVE || assignment.isActive || 0),
          createdAt: String(assignment.CREATED_AT || assignment.createdAt || ''),
          updatedAt: String(assignment.UPDATED_AT || assignment.updatedAt || ''),
          userName: String(assignment.USER_NAME || assignment.userName || ''),
          userEmail: String(assignment.USER_EMAIL || assignment.userEmail || ''),
          conferenceName: String(assignment.CONFERENCE_NAME || assignment.conferenceName || '')
        };
        
        // Return a JSON-parsed copy to ensure no circular references
        return JSON.parse(JSON.stringify(cleanAssignment));
      });
      
      res.json({
        success: true,
        data: cleanAssignments
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new assignment
  async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, conferenceId, permissions } = req.body;
      const assignedBy = (req as any).user?.id;

      if (!assignedBy) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate user exists and is staff
      const user = await usersRepository.findById(Number(userId));
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Validate conference exists
      const conference = await conferencesRepository.findById(Number(conferenceId));
      if (!conference) {
        res.status(404).json({
          success: false,
          message: 'Conference not found'
        });
        return;
      }

      // Check if assignment already exists
      const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(Number(userId));
      const existingAssignment = existingAssignments.find(a => a.conferenceId === Number(conferenceId));
      
      if (existingAssignment) {
        res.status(409).json({
          success: false,
          message: 'User is already assigned to this conference'
        });
        return;
      }

      const assignmentId = await userConferenceAssignmentsRepository.create({
        userId: Number(userId),
        conferenceId: Number(conferenceId),
        permissions: permissions || {},
        assignedBy
      });

      res.status(201).json({
        success: true,
        data: { id: assignmentId },
        message: 'Conference assignment created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update assignment
  async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions, isActive } = req.body;

      const assignment = await userConferenceAssignmentsRepository.findById(Number(id));
      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
        return;
      }

      await userConferenceAssignmentsRepository.update(Number(id), {
        permissions,
        isActive
      });

      res.json({
        success: true,
        message: 'Assignment updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete assignment
  async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const assignment = await userConferenceAssignmentsRepository.findById(Number(id));
      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
        return;
      }

      await userConferenceAssignmentsRepository.delete(Number(id));

      res.json({
        success: true,
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Deactivate assignment (soft delete)
  async deactivateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const assignment = await userConferenceAssignmentsRepository.findById(Number(id));
      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
        return;
      }

      await userConferenceAssignmentsRepository.deactivate(Number(id));

      res.json({
        success: true,
        message: 'Assignment deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Check if user has permission for specific conference
  async checkPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, conferenceId, permission } = req.params;

      if (!userId || !conferenceId || !permission) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      const hasPermission = await userConferenceAssignmentsRepository.checkUserConferencePermission(
        Number(userId),
        Number(conferenceId),
        permission
      );

      res.json({
        success: true,
        data: { hasPermission }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all permissions for a user across all conferences
  async getUserPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const permissions = await userConferenceAssignmentsRepository.getUserConferencePermissions(Number(userId));

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk assign conferences to user
  async bulkAssignConferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, conferenceIds, permissions } = req.body;
      const assignedBy = (req as any).user?.id;

      if (!assignedBy) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate user exists and is staff
      const user = await usersRepository.findById(Number(userId));
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const conferenceId of conferenceIds) {
        try {
          // Validate conference exists
          const conference = await conferencesRepository.findById(Number(conferenceId));
          if (!conference) {
            errors.push(`Conference ${conferenceId} not found`);
            continue;
          }

          // Check if assignment already exists
          const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(Number(userId));
          const existingAssignment = existingAssignments.find(a => a.conferenceId === Number(conferenceId));
          
          if (existingAssignment) {
            errors.push(`User already assigned to conference ${conferenceId}`);
            continue;
          }

          const assignmentId = await userConferenceAssignmentsRepository.create({
            userId: Number(userId),
            conferenceId: Number(conferenceId),
            permissions: permissions || {},
            assignedBy
          });

          results.push({ conferenceId, assignmentId });
        } catch (error) {
          errors.push(`Failed to assign conference ${conferenceId}: ${error}`);
        }
      }

      res.json({
        success: true,
        data: {
          successful: results,
          errors: errors
        },
        message: `Successfully assigned ${results.length} conferences, ${errors.length} errors`
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userConferenceAssignmentsController = new UserConferenceAssignmentsController();
