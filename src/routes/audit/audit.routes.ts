import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { list, getById } from '../../modules/audit/audit.controller';

export const auditRouter = Router();

auditRouter.get('/logs', auth(), rbac('audit.read'), list);
auditRouter.get('/:id', auth(), rbac('audit.read'), getById);


