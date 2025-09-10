import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import {
  me,
  updateMe,
  refreshPermissions,
  list,
  listAllUsers,
  getById,
  create,
  update,
  remove,
  assignRole,
  removeRole,
  listRoles,
  getUsersWithMessages,
  getAvailableUsers,
  testDatabaseConnection,
  testAvailableUsers,
  getUsersByConferenceCategory,
  getConferenceUsersWithDetails,
} from '../../modules/users/users.controller';

export const usersRouter = Router();

usersRouter.get('/me', auth(), me);
usersRouter.patch('/me', auth(), updateMe);
usersRouter.get('/me/refresh-permissions', auth(), refreshPermissions);
usersRouter.get('/', auth(), rbac('roles.manage'), list);
usersRouter.get('/all', auth(), listAllUsers);
usersRouter.post('/', auth(), rbac('roles.manage'), audit('user', 'create', 'user'), create);
usersRouter.get('/:id', auth(), rbac('roles.manage'), getById);
usersRouter.patch('/:id', auth(), rbac('roles.manage'), audit('user', 'update', 'user'), update);
usersRouter.delete('/:id', auth(), rbac('roles.manage'), audit('user', 'delete', 'user'), remove);
usersRouter.get('/:id/roles', auth(), rbac('roles.manage'), listRoles);
usersRouter.post(
  '/:id/roles',
  auth(),
  rbac('roles.manage'),
  audit('user', 'assign-role', 'user'),
  assignRole
);
usersRouter.delete(
  '/:id/roles/:roleId',
  auth(),
  rbac('roles.manage'),
  audit('user', 'remove-role', 'user'),
  removeRole
);
usersRouter.get('/with-messages', auth(), getUsersWithMessages);
usersRouter.get('/available', getAvailableUsers);
usersRouter.get('/by-conference-category', auth(), getUsersByConferenceCategory);
usersRouter.get('/conference-users-with-details', auth(), getConferenceUsersWithDetails);
usersRouter.get('/test-db', testDatabaseConnection);
usersRouter.get('/test-available', testAvailableUsers);
