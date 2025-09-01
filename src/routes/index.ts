import { Router } from 'express';
import { authRouter } from './auth';
import { initPool } from '../config/db';
import { auditRouter } from './audit';
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

export const router = Router();

router.get('/ping', (_req, res) => res.json({ data: 'pong' }));
router.use('/auth', authRouter);
router.use('/audit', auditRouter);
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

router.post('/_init-db', async (_req, res) => {
  await initPool();
  res.json({ data: { db: 'initialized' } });
});


