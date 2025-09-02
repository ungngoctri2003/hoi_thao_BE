import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ok } from '../../utils/responses';

const settingsFile = path.join(process.cwd(), 'settings.json');

export async function getSettings(_req: Request, res: Response): Promise<void> {
  if (!fs.existsSync(settingsFile)) {
    res.json(ok({}));
    return;
  }
  const raw = fs.readFileSync(settingsFile, 'utf-8');
  res.json(ok(JSON.parse(raw || '{}')));
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(req.body || {}, null, 2), 'utf-8');
    res.json(ok({ updated: true }));
  } catch (e) { next(e); }
}




