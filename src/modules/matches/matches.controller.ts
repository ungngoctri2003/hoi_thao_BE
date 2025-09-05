import { Request, Response, NextFunction } from 'express';
import { ok } from '../../utils/responses';
import { matchesRepository } from './matches.repository';

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(ok(await matchesRepository.listByAttendee(Number(req.query.attendeeId)))); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { const id = await matchesRepository.create(req.body.attendeeAId, req.body.attendeeBId, req.body.score); res.status(201).json(ok({ id })); } catch (e) { next(e); }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await matchesRepository.remove(Number(req.params.id)); res.status(204).send(); } catch (e) { next(e); }
}
export async function suggestions(req: Request, res: Response, next: NextFunction) {
  try { res.json(ok(await matchesRepository.suggestions(Number(req.query.attendeeId)))); } catch (e) { next(e); }
}













