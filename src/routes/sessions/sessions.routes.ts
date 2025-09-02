import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove, assignRoom, listPublic } from '../../modules/sessions/sessions.controller';

export const sessionsRouter = Router();

// Public access for listing sessions
sessionsRouter.get('/sessions', listPublic);

sessionsRouter.get('/conferences/:confId/sessions', auth(), rbac('conferences.read'), list);
sessionsRouter.post('/conferences/:confId/sessions', auth(), rbac('sessions.write'), audit('conference', 'session-create', 'session'), create);
sessionsRouter.get('/sessions/:id', auth(), rbac('conferences.read'), getById);
sessionsRouter.patch('/sessions/:id', auth(), rbac('sessions.write'), audit('conference', 'session-update', 'session'), update);
sessionsRouter.delete('/sessions/:id', auth(), rbac('sessions.write'), audit('conference', 'session-delete', 'session'), remove);
sessionsRouter.post('/sessions/:id/assign-room', auth(), rbac('sessions.write'), audit('conference', 'session-assign-room', 'session'), assignRoom);






