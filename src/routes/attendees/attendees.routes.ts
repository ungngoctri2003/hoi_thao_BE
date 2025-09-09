import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove, listRegistrations, search, updateMe, createRegistration, listByConference } from '../../modules/attendees/attendees.controller';

export const attendeesRouter = Router();

attendeesRouter.get('/', auth(), rbac('attendees.read'), list);
attendeesRouter.post('/', auth(), rbac('attendees.write'), audit('data', 'create', 'attendee'), create);
attendeesRouter.get('/search', auth(), rbac('attendees.read'), search);
attendeesRouter.patch('/me', auth(), updateMe); // Allow users to update their own attendee info
attendeesRouter.get('/:id', auth(), rbac('attendees.read'), getById);
attendeesRouter.patch('/:id', auth(), rbac('attendees.write'), audit('data', 'update', 'attendee'), update);
attendeesRouter.delete('/:id', auth(), rbac('attendees.write'), audit('data', 'delete', 'attendee'), remove);
attendeesRouter.get('/:id/registrations', auth(), rbac('attendees.read'), listRegistrations);
attendeesRouter.post('/:id/registrations', auth(), rbac('attendees.write'), audit('conference', 'create', 'registration'), createRegistration);
attendeesRouter.get('/conference/:conferenceId', auth(), rbac('attendees.read'), listByConference);






