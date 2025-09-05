import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove, changeStatus, listPublic } from '../../modules/conferences/conferences.controller';

export const conferencesRouter = Router();

// Public access for listing active conferences
conferencesRouter.get('/', listPublic);

// Protected fallback for other queries
conferencesRouter.get('/', auth(), rbac('conferences.view'), list);
conferencesRouter.post('/', auth(), rbac('conferences.create'), audit('conference', 'create', 'conference'), create);
conferencesRouter.get('/:id', auth(), rbac('conferences.view'), getById);
conferencesRouter.patch('/:id', auth(), rbac('conferences.update'), audit('conference', 'update', 'conference'), update);
conferencesRouter.patch('/:id/status', auth(), rbac('conferences.update'), audit('conference', 'status', 'conference'), changeStatus);
conferencesRouter.delete('/:id', auth(), rbac('conferences.delete'), audit('conference', 'delete', 'conference'), remove);






