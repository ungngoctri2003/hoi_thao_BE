import { Request, Response, NextFunction } from 'express';
import { sessionsRepository } from './sessions.repository';
import { ok } from '../../utils/responses';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await sessionsRepository.list(Number(req.params.confId), {
      status: (req.query.status as string) || undefined,
      roomId: req.query.roomId ? Number(req.query.roomId) : undefined
    });
    res.json(ok(rows));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await sessionsRepository.findById(Number(req.params.id));
    if (!item) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await sessionsRepository.create(Number(req.params.confId), req.body);
    res.status(201).json(ok(item));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await sessionsRepository.update(Number(req.params.id), req.body);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function assignRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await sessionsRepository.assignRoom(Number(req.params.id), req.body.roomId);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await sessionsRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
}





