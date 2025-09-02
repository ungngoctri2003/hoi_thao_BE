import { Request, Response, NextFunction } from 'express';
import { usersRepository } from './users.repository';
import { ok } from '../../utils/responses';
import { parsePagination, meta } from '../../utils/pagination';
import { hashPassword } from '../../utils/crypto';

export async function me(req: Request, res: Response) {
  res.json(ok({ id: req.user!.id, email: req.user!.email, permissions: req.user!.permissions || [] }));
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rows, total } = await usersRepository.list(page, limit);
    res.json(ok(rows, meta(page, limit, total)));
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersRepository.findById(Number(req.params.id));
    if (!user) res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json(ok(user));
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const passwordHash = req.body.password ? await hashPassword(req.body.password) : null;
    const user = await usersRepository.create({ EMAIL: req.body.email, NAME: req.body.name, PASSWORD_HASH: passwordHash });
    res.status(201).json(ok(user));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data: any = { EMAIL: req.body.email, NAME: req.body.name, STATUS: req.body.status };
    if (req.body.password) data.PASSWORD_HASH = await hashPassword(req.body.password);
    const user = await usersRepository.update(Number(req.params.id), data);
    res.json(ok(user));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.remove(Number(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.assignRole(Number(req.params.id), req.body.roleId);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function removeRole(req: Request, res: Response, next: NextFunction) {
  try {
    await usersRepository.removeRole(Number(req.params.id), Number(req.params.roleId));
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function listRoles(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await usersRepository.listRoles(Number(req.params.id))));
  } catch (e) { next(e); }
}






