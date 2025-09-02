import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { permissionsRepository } from '../../modules/permissions/permissions.repository';

export const permissionsRouter = Router();

permissionsRouter.get('/', auth(), rbac('roles.admin'), async (_req, res, next) => {
  try { res.json({ data: await permissionsRepository.list() }); } catch (e) { next(e); }
});

permissionsRouter.post('/', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { const id = await permissionsRepository.create(req.body.code, req.body.name, req.body.category, req.body.description); res.status(201).json({ data: { id } }); } catch (e) { next(e); }
});






