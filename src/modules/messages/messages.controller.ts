import { Request, Response, NextFunction } from 'express';
import { messagesRepository } from './messages.repository';
import { parsePagination, meta } from '../../utils/pagination';
import { ok } from '../../utils/responses';
import { emitSessionMessage } from '../../sockets';

export async function listBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await messagesRepository.listBySession(Number(req.params.id), page, limit);
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await messagesRepository.create(Number(req.params.id), req.body.attendeeId ?? null, req.body.type || 'text', String(req.body.content || ''));
    emitSessionMessage(Number(req.params.id), row);
    res.status(201).json(ok(row));
  } catch (e) { next(e); }
}













