import { Request, Response, NextFunction } from 'express';
import { userConferenceAssignmentsRepository } from '../user-conference-assignments/user-conference-assignments.repository';
import { conferencesRepository } from '../conferences/conferences.repository';
import { usersRepository } from '../users/users.repository';
import { logger } from '../../app';

export class ConferenceRegistrationsController {
  // Register for a conference
  async registerForConference(req: Request, res: Response, next: NextFunction) {
    try {
      const { conferenceId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Validate conference exists
      const conference = await conferencesRepository.findById(Number(conferenceId));
      if (!conference) {
        res.status(404).json({
          success: false,
          message: 'Conference not found',
        });
        return;
      }

      // Check if user is already registered
      const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(
        Number(userId)
      );
      const existingAssignment = existingAssignments.find(
        a => a.conferenceId === Number(conferenceId)
      );

      if (existingAssignment) {
        res.status(409).json({
          success: false,
          message: 'User is already registered for this conference',
        });
        return;
      }

      // Create assignment for attendee role
      const assignmentId = await userConferenceAssignmentsRepository.create({
        userId: Number(userId),
        conferenceId: Number(conferenceId),
        permissions: {
          'conferences.view': true,
          'sessions.view': true,
          'venue.view': true,
          'badges.view': true,
          'mobile.view': true,
        },
        assignedBy: userId, // Self-assigned
      });

      res.status(201).json({
        success: true,
        data: { id: assignmentId },
        message: 'Successfully registered for conference',
      });
    } catch (error) {
      next(error);
    }
  }

  // Unregister from a conference
  async unregisterFromConference(req: Request, res: Response, next: NextFunction) {
    try {
      const { conferenceId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Find existing assignment
      const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(
        Number(userId)
      );
      const existingAssignment = existingAssignments.find(
        a => a.conferenceId === Number(conferenceId)
      );

      if (!existingAssignment) {
        res.status(404).json({
          success: false,
          message: 'User is not registered for this conference',
        });
        return;
      }

      // Deactivate the assignment
      await userConferenceAssignmentsRepository.deactivate(existingAssignment.id);

      res.json({
        success: true,
        message: 'Successfully unregistered from conference',
      });
    } catch (error) {
      next(error);
    }
  }

  // Check registration status
  async checkRegistrationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { conferenceId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Find existing assignment
      const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(
        Number(userId)
      );
      const existingAssignment = existingAssignments.find(
        a => a.conferenceId === Number(conferenceId)
      );

      res.json({
        success: true,
        data: {
          isRegistered: !!existingAssignment,
          assignment: existingAssignment
            ? {
                id: existingAssignment.id,
                assignedAt: existingAssignment.assignedAt,
                permissions: existingAssignment.permissions,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's conference registrations
  async getUserRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const assignments = await userConferenceAssignmentsRepository.findByUserId(Number(userId));

      // Clean the data to avoid circular references
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
          conferenceName: String(assignment.CONFERENCE_NAME || assignment.conferenceName || ''),
        };
        return JSON.parse(JSON.stringify(cleanAssignment));
      });

      res.json({
        success: true,
        data: cleanAssignments,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const conferenceRegistrationsController = new ConferenceRegistrationsController();

