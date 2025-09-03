import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { getSettings, updateSettings } from '../../modules/settings/settings.controller';

export const settingsRouter = Router();

settingsRouter.get('/settings', auth(), rbac('roles.admin'), getSettings);
settingsRouter.patch('/settings', auth(), rbac('roles.admin'), updateSettings);









