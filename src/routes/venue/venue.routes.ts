import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { audit } from '../../middlewares/audit';
import { floorsRepository } from '../../modules/venue/floors.repository';
import { roomsRepository } from '../../modules/venue/rooms.repository';

export const venueRouter = Router();

venueRouter.get('/conferences/:confId/floors', auth(), rbac('conferences.read'), async (req, res, next) => {
  try { res.json({ data: await floorsRepository.list(Number(req.params.confId)) }); } catch (e) { next(e); }
});
venueRouter.post('/conferences/:confId/floors', auth(), rbac('conferences.write'), audit('conference', 'floor-create', 'floor'), async (req, res, next) => {
  try { const id = await floorsRepository.create(Number(req.params.confId), req.body.floorNumber); res.status(201).json({ data: { id } }); } catch (e) { next(e); }
});
venueRouter.delete('/floors/:id', auth(), rbac('conferences.write'), audit('conference', 'floor-delete', 'floor'), async (req, res, next) => {
  try { await floorsRepository.remove(Number(req.params.id)); res.status(204).send(); } catch (e) { next(e); }
});

venueRouter.get('/floors/:floorId/rooms', auth(), rbac('conferences.read'), async (req, res, next) => {
  try { res.json({ data: await roomsRepository.list(Number(req.params.floorId)) }); } catch (e) { next(e); }
});
venueRouter.post('/floors/:floorId/rooms', auth(), rbac('conferences.write'), audit('conference', 'room-create', 'room'), async (req, res, next) => {
  try { const id = await roomsRepository.create(Number(req.params.floorId), req.body.name, req.body.capacity); res.status(201).json({ data: { id } }); } catch (e) { next(e); }
});
venueRouter.delete('/rooms/:id', auth(), rbac('conferences.write'), audit('conference', 'room-delete', 'room'), async (req, res, next) => {
  try { await roomsRepository.remove(Number(req.params.id)); res.status(204).send(); } catch (e) { next(e); }
});





