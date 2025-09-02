import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove, changeStatus } from '../../modules/conferences/conferences.controller';

export const conferencesRouter = Router();

conferencesRouter.get('/', auth(), rbac('conferences.read'), list);
conferencesRouter.post('/', auth(), rbac('conferences.write'), audit('conference', 'create', 'conference'), create);
conferencesRouter.get('/:id', auth(), rbac('conferences.read'), getById);
conferencesRouter.patch('/:id', auth(), rbac('conferences.write'), audit('conference', 'update', 'conference'), update);
conferencesRouter.patch('/:id/status', auth(), rbac('conferences.write'), audit('conference', 'status', 'conference'), changeStatus);
conferencesRouter.delete('/:id', auth(), rbac('conferences.write'), audit('conference', 'delete', 'conference'), remove);






