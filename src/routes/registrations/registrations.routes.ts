import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { list, getById, create, update, remove, publicRegistration, checkin, checkout } from '../../modules/registrations/registrations.controller';

export const registrationsRouter = Router();

// Public registration endpoint
registrationsRouter.post('/public', publicRegistration);

registrationsRouter.get('/', auth(), rbac('registrations.read'), list);
registrationsRouter.post('/', auth(), rbac('registrations.write'), audit('conference', 'create', 'registration'), create);
registrationsRouter.get('/:id', auth(), rbac('registrations.read'), getById);
registrationsRouter.patch('/:id', auth(), rbac('registrations.write'), audit('conference', 'update', 'registration'), update);
registrationsRouter.delete('/:id', auth(), rbac('registrations.write'), audit('conference', 'delete', 'registration'), remove);

// Checkin/Checkout endpoints (using checkin.manage permission instead of registrations.write)
registrationsRouter.post('/:id/checkin', auth(), rbac('checkin.manage'), audit('conference', 'checkin', 'registration'), checkin);
registrationsRouter.post('/:id/checkout', auth(), rbac('checkin.manage'), audit('conference', 'checkout', 'registration'), checkout);






