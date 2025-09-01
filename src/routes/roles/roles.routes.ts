import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { rolesRepository } from '../../modules/roles/roles.repository';
import { permissionsRepository } from '../../modules/permissions/permissions.repository';

export const rolesRouter = Router();

rolesRouter.get('/', auth(), rbac('roles.admin'), async (_req, res, next) => {
  try { res.json({ data: await rolesRepository.list() }); } catch (e) { next(e); }
});

rolesRouter.post('/', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { const id = await rolesRepository.create(req.body.code, req.body.name); res.status(201).json({ data: { id } }); } catch (e) { next(e); }
});

rolesRouter.post('/:id/permissions', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { await rolesRepository.assignPermission(Number(req.params.id), req.body.permissionId); res.status(204).send(); } catch (e) { next(e); }
});
rolesRouter.delete('/:id/permissions/:permId', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { await rolesRepository.removePermission(Number(req.params.id), Number(req.params.permId)); res.status(204).send(); } catch (e) { next(e); }
});


