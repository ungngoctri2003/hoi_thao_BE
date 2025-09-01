import { Request, Response, NextFunction } from 'express';
import { ok } from '../../utils/responses';
import { auditRepository } from './audit.repository';
import { parsePagination, meta } from '../../utils/pagination';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await auditRepository.list({
      page, limit,
      userId: req.query.userId ? Number(req.query.userId) : undefined,
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
      q: req.query.q as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined
    });
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await auditRepository.getById(Number(req.params.id));
    if (!item) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Audit not found' } });
    res.json(ok(item));
  } catch (e) { next(e); }
}


