import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { me, updateMe, list, getById, create, update, remove, assignRole, removeRole, listRoles } from '../../modules/users/users.controller';

export const usersRouter = Router();

usersRouter.get('/me', auth(), me);
usersRouter.patch('/me', auth(), updateMe);
usersRouter.get('/', auth(), rbac('roles.admin'), list);
usersRouter.post('/', auth(), rbac('roles.admin'), audit('user', 'create', 'user'), create);
usersRouter.get('/:id', auth(), rbac('roles.admin'), getById);
usersRouter.patch('/:id', auth(), rbac('roles.admin'), audit('user', 'update', 'user'), update);
usersRouter.delete('/:id', auth(), rbac('roles.admin'), audit('user', 'delete', 'user'), remove);
usersRouter.get('/:id/roles', auth(), rbac('roles.admin'), listRoles);
usersRouter.post('/:id/roles', auth(), rbac('roles.admin'), audit('user', 'assign-role', 'user'), assignRole);
usersRouter.delete('/:id/roles/:roleId', auth(), rbac('roles.admin'), audit('user', 'remove-role', 'user'), removeRole);






