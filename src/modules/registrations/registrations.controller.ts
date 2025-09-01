import { Request, Response, NextFunction } from 'express';
import { registrationsRepository } from './registrations.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await registrationsRepository.list({
      page, limit,
      attendeeId: req.query.attendeeId ? Number(req.query.attendeeId) : undefined,
      conferenceId: req.query.conferenceId ? Number(req.query.conferenceId) : undefined,
      status: req.query.status as string | undefined
    });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await registrationsRepository.findById(Number(req.params.id));
    if (!item) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registration not found' } });
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await registrationsRepository.create({ ATTENDEE_ID: req.body.attendeeId, CONFERENCE_ID: req.body.conferenceId });
    res.status(201).json(ok(item));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await registrationsRepository.update(Number(req.params.id), req.body.status);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await registrationsRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
}





