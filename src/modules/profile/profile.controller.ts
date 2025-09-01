import { Request, Response, NextFunction } from 'express';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const data = await withConn(async (conn) => {
      const userRes = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT, LAST_LOGIN FROM APP_USERS WHERE ID = :id`,
        { id: userId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const attendeeRes = await conn.execute(
        `SELECT ID, NAME, EMAIL, COMPANY, POSITION, AVATAR_URL, GENDER FROM ATTENDEES WHERE EMAIL = :email`,
        { email },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return {
        user: ((userRes.rows as any[])[0]) || null,
        attendee: ((attendeeRes.rows as any[])[0]) || null
      };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const email = req.user!.email;
    const name: string | undefined = req.body.name;
    const result = await withConn(async (conn) => {
      if (name) {
        await conn.execute(`UPDATE APP_USERS SET NAME = :name WHERE ID = :id`, { name, id: userId }, { autoCommit: true });
        await conn.execute(`UPDATE ATTENDEES SET NAME = :name WHERE EMAIL = :email`, { name, email }, { autoCommit: true });
      }
      const userRes = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT, LAST_LOGIN FROM APP_USERS WHERE ID = :id`,
        { id: userId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (userRes.rows as any[])[0];
    });
    res.json(ok(result));
  } catch (e) { next(e); }
}





