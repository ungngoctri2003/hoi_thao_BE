import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { list, create, remove, suggestions } from '../../modules/matches/matches.controller';

export const matchesRouter = Router();

matchesRouter.get('/matches', auth(), rbac('conferences.view'), list);
matchesRouter.post('/matches', auth(), rbac('conferences.view'), create);
matchesRouter.delete('/matches/:id', auth(), rbac('conferences.view'), remove);
matchesRouter.get('/matches/suggestions', auth(), rbac('conferences.view'), suggestions);











