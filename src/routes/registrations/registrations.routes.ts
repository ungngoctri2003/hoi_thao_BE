import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove } from '../../modules/registrations/registrations.controller';

export const registrationsRouter = Router();

registrationsRouter.get('/', auth(), rbac('registrations.read'), list);
registrationsRouter.post('/', auth(), rbac('registrations.write'), audit('conference', 'create', 'registration'), create);
registrationsRouter.get('/:id', auth(), rbac('registrations.read'), getById);
registrationsRouter.patch('/:id', auth(), rbac('registrations.write'), audit('conference', 'update', 'registration'), update);
registrationsRouter.delete('/:id', auth(), rbac('registrations.write'), audit('conference', 'delete', 'registration'), remove);





