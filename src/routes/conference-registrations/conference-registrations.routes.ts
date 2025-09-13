import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { conferenceRegistrationsController } from '../../modules/conference-registrations/conference-registrations.controller';

export const conferenceRegistrationsRouter = Router();

// All routes require authentication
conferenceRegistrationsRouter.use(auth());

// Register for a conference
conferenceRegistrationsRouter.post(
  '/:conferenceId/register',
  conferenceRegistrationsController.registerForConference.bind(conferenceRegistrationsController)
);

// Unregister from a conference
conferenceRegistrationsRouter.delete(
  '/:conferenceId/unregister',
  conferenceRegistrationsController.unregisterFromConference.bind(conferenceRegistrationsController)
);

// Check registration status
conferenceRegistrationsRouter.get(
  '/:conferenceId/status',
  conferenceRegistrationsController.checkRegistrationStatus.bind(conferenceRegistrationsController)
);

// Get user's registrations
conferenceRegistrationsRouter.get(
  '/my-registrations',
  conferenceRegistrationsController.getUserRegistrations.bind(conferenceRegistrationsController)
);

