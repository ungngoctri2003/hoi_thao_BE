import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { rolesRepository } from '../../modules/roles/roles.repository';
import { permissionsRepository } from '../../modules/permissions/permissions.repository';
import { emitUserPermissionChange } from '../../sockets';
import { usersRepository } from '../../modules/users/users.repository';

export const rolesRouter = Router();

rolesRouter.get('/', auth(), rbac('roles.admin'), async (_req, res, next) => {
  try { res.json({ data: await rolesRepository.list() }); } catch (e) { next(e); }
});

rolesRouter.post('/', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { const id = await rolesRepository.create(req.body.code, req.body.name); res.status(201).json({ data: { id } }); } catch (e) { next(e); }
});

rolesRouter.post('/:id/permissions', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { 
    await rolesRepository.assignPermission(Number(req.params.id), req.body.permissionId); 
    
    // Notify all users with this role about permission change
    const usersWithRole = await usersRepository.getUsersByRole(Number(req.params.id));
    for (const user of usersWithRole) {
      const userPermissions = await usersRepository.getPermissions(user.ID);
      emitUserPermissionChange(user.ID, {
        type: 'permission_changed',
        permissions: userPermissions,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(204).send(); 
  } catch (e) { next(e); }
});
rolesRouter.delete('/:id/permissions/:permId', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { 
    await rolesRepository.removePermission(Number(req.params.id), Number(req.params.permId)); 
    
    // Notify all users with this role about permission change
    const usersWithRole = await usersRepository.getUsersByRole(Number(req.params.id));
    for (const user of usersWithRole) {
      const userPermissions = await usersRepository.getPermissions(user.ID);
      emitUserPermissionChange(user.ID, {
        type: 'permission_changed',
        permissions: userPermissions,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(204).send(); 
  } catch (e) { next(e); }
});

rolesRouter.get('/:id/permissions', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { res.json({ data: await rolesRepository.getPermissions(Number(req.params.id)) }); } catch (e) { next(e); }
});

rolesRouter.patch('/:id', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { 
    await rolesRepository.update(Number(req.params.id), req.body.code, req.body.name); 
    // Return the updated role data
    const updatedRole = await rolesRepository.findById(Number(req.params.id));
    res.json({ data: updatedRole }); 
  } catch (e) { next(e); }
});

rolesRouter.delete('/:id', auth(), rbac('roles.admin'), async (req, res, next) => {
  try { await rolesRepository.delete(Number(req.params.id)); res.status(204).send(); } catch (e) { next(e); }
});


