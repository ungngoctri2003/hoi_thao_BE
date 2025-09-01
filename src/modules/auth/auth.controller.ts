import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { ok } from '../../utils/responses';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.refresh(req.body.refreshToken);
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.register(req.body);
    res.status(201).json(ok(data));
  } catch (e) { next(e); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.issuePasswordReset(req.body.email);
    res.json(ok({ requested: true, ...(data ? { token: data.token } : {}) }));
  } catch (e) { next(e); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json(ok({ reset: true }));
  } catch (e) { next(e); }
}


