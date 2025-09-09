import { Router } from 'express';
import { authRouter } from './auth';
import { initPool } from '../config/db';
import { auditRouter } from './audit';
import { frontendAuditRouter } from './audit/frontend-audit.routes';
import { attendeesRouter } from './attendees';
import { rolesRouter } from './roles';
import { permissionsRouter } from './permissions';
import { registrationsRouter } from './registrations/registrations.routes';
import { checkinsRouter } from './checkins/checkins.routes';
import { conferencesRouter } from './conferences/conferences.routes';
import { venueRouter } from './venue/venue.routes';
import { sessionsRouter } from './sessions/sessions.routes';
import { usersRouter } from './users/users.routes';
import { messagesRouter } from './messages/messages.routes';
import { analyticsRouter } from './analytics/analytics.routes';
import { matchesRouter } from './matches/matches.routes';
import { profileRouter } from './profile/profile.routes';
import { settingsRouter } from './settings/settings.routes';
import { badgesRouter } from './badges/badges.routes';
import { certificatesRouter } from './certificates/certificates.routes';
import { healthRouter } from './health/health.routes';
import { uploadRouter } from './upload/upload.routes';
import notificationsRouter from './notifications/notifications.routes';
import { userConferenceAssignmentsRouter } from './user-conference-assignments/user-conference-assignments.routes';
import { publicRouter } from './public/public.routes';
import { testRouter } from './test/test.routes';

export const router = Router();

router.get('/ping', (_req, res) => res.json({ data: 'pong' }));

// Public routes (no authentication required)
router.use('/public', publicRouter);

// Protected routes (authentication required)
router.use('/auth', authRouter);
router.use('/audit', auditRouter);
router.use('/audit/frontend', frontendAuditRouter);
router.use('/attendees', attendeesRouter);
router.use('/roles', rolesRouter);
router.use('/permissions', permissionsRouter);
router.use('/registrations', registrationsRouter);
router.use('/checkins', checkinsRouter);
router.use('/conferences', conferencesRouter);
router.use('/', venueRouter);
router.use('/', sessionsRouter);
router.use('/users', usersRouter);
router.use('/', messagesRouter);
router.use('/', analyticsRouter);
router.use('/', matchesRouter);
router.use('/', profileRouter);
router.use('/', settingsRouter);
router.use('/', badgesRouter);
router.use('/', certificatesRouter);
router.use('/health', healthRouter);
router.use('/upload', uploadRouter);
router.use('/notifications', notificationsRouter);
router.use('/user-conference-assignments', userConferenceAssignmentsRouter);
router.use('/test', testRouter);

router.post('/_init-db', async (_req, res) => {
  await initPool();
  res.json({ data: { db: 'initialized' } });
});


