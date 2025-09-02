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
    res.json(ok({ requested: true, passwordSent: data?.passwordSent || false }));
  } catch (e) { next(e); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json(ok({ reset: true }));
  } catch (e) { next(e); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id; // Get user ID from JWT token
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    await authService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
    res.json(ok({ changed: true }));
  } catch (e) { next(e); }
}


