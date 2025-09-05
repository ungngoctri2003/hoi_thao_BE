import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { listBySession, create } from '../../modules/messages/messages.controller';

export const messagesRouter = Router();

messagesRouter.get('/sessions/:id/messages', auth(), rbac('conferences.view'), listBySession);
messagesRouter.post('/sessions/:id/messages', auth(), rbac('conferences.view'), create);











