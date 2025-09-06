import { Request, Response, NextFunction } from 'express';
import { auditRepository } from '../modules/audit/audit.repository';

export function audit(category: 'auth' | 'user' | 'conference' | 'system' | 'data' | 'frontend', action: string, resource?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', async () => {
      const status = res.statusCode < 400 ? 'success' : res.statusCode < 500 ? 'warning' : 'failed';
      const details = JSON.stringify({ method: req.method, path: req.originalUrl, durationMs: Date.now() - start, body: req.body });
      try {
        await auditRepository.insert({
          USER_ID: req.user?.id ?? null,
          ACTION_NAME: action,
          RESOURCE_NAME: resource || req.path,
          DETAILS: details,
          IP_ADDRESS: req.ip ?? null,
          USER_AGENT: req.headers['user-agent'] || null,
          STATUS: status,
          CATEGORY: category
        });
      } catch { /* ignore audit errors */ }
    });
    next();
  };
}


