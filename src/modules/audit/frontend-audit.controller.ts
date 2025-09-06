import { Request, Response, NextFunction } from 'express';
import { ok } from '../../utils/responses';
import { frontendAuditRepository } from './frontend-audit.repository';

export async function createFrontendAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, page, details, timestamp } = req.body;
    const userId = req.user?.id;

    const log = await frontendAuditRepository.create({
      userId,
      action,
      page,
      details,
      timestamp: timestamp || new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null
    });

    res.json(ok(log));
  } catch (e) { 
    next(e); 
  }
}
