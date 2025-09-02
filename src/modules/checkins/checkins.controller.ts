import { Request, Response, NextFunction } from 'express';
import { checkinsRepository } from './checkins.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';

export async function scan(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await checkinsRepository.scanByQr(req.body.qrCode);
    res.status(201).json(ok(row));
  } catch (e) { next(e); }
}

export async function manual(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await checkinsRepository.manual(req.body.registrationId);
    res.status(201).json(ok(row));
  } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await checkinsRepository.list({
      page, limit,
      conferenceId: req.query.conferenceId ? Number(req.query.conferenceId) : undefined,
      attendeeId: req.query.attendeeId ? Number(req.query.attendeeId) : undefined
    });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}






