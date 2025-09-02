import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { list, create, remove, suggestions } from '../../modules/matches/matches.controller';

export const matchesRouter = Router();

matchesRouter.get('/matches', auth(), rbac('conferences.read'), list);
matchesRouter.post('/matches', auth(), rbac('conferences.read'), create);
matchesRouter.delete('/matches/:id', auth(), rbac('conferences.read'), remove);
matchesRouter.get('/matches/suggestions', auth(), rbac('conferences.read'), suggestions);






