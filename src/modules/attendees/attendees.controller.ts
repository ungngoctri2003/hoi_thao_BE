import { Request, Response, NextFunction } from 'express';
import { attendeesRepository } from './attendees.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';
import { audit } from '../../middlewares/audit';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filters = {
      email: req.query['filters[email]'],
      name: req.query['filters[name]'],
      company: req.query['filters[company]'],
      gender: req.query['filters[gender]']
    } as any;
    const search = (req.query.search as string) || null;
    const { rows, total } = await attendeesRepository.list({ page, limit, filters, search });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await attendeesRepository.findById(Number(req.params.id));
    if (!item) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attendee not found' } });
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await attendeesRepository.create(req.body);
    res.status(201).json(ok(item));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await attendeesRepository.update(Number(req.params.id), req.body);
    res.json(ok(item));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await attendeesRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function listRegistrations(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await attendeesRepository.listRegistrationsByAttendee(Number(req.params.id));
    res.json(ok(rows));
  } catch (e) { next(e); }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || '');
    const rows = await attendeesRepository.search(q, Number(req.query.limit || 10));
    res.json(ok(rows));
  } catch (e) { next(e); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.user!.email;
    const attendee = await attendeesRepository.findByEmail(email);
    
    if (!attendee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attendee not found' } });
      return;
    }
    
    const updatedAttendee = await attendeesRepository.update(attendee.ID, req.body);
    res.json(ok(updatedAttendee));
  } catch (e) { next(e); }
}






