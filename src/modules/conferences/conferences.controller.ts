import { Request, Response, NextFunction } from 'express';
import { conferencesRepository } from './conferences.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';
import { 
  createConferenceSchema, 
  updateConferenceSchema, 
  changeStatusSchema,
  listConferencesSchema,
  conferenceIdSchema
} from './conferences.schemas';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await conferencesRepository.list(page, limit);
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await conferencesRepository.findById(Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conference not found' } });
      return;
    }
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await conferencesRepository.create(req.body);
    res.status(201).json(ok(item));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await conferencesRepository.update(Number(req.params.id), req.body);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function changeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await conferencesRepository.changeStatus(Number(req.params.id), req.body.status);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await conferencesRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
}




