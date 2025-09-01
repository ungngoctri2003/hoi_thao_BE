import { Request, Response, NextFunction } from 'express';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';

export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withConn(async (conn) => {
      const attendees = await conn.execute(`SELECT COUNT(*) AS CNT FROM ATTENDEES`, {}, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const registrations = await conn.execute(`SELECT COUNT(*) AS CNT FROM REGISTRATIONS`, {}, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const checkins = await conn.execute(`SELECT COUNT(*) AS CNT FROM CHECKINS`, {}, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return {
        attendees: Number(((attendees.rows as any[])[0] as any).CNT),
        registrations: Number(((registrations.rows as any[])[0] as any).CNT),
        checkins: Number(((checkins.rows as any[])[0] as any).CNT)
      };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function conferenceAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const confId = Number(req.params.id);
    const data = await withConn(async (conn) => {
      const total = await conn.execute(`SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE CONFERENCE_ID = :id`, { id: confId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const checked = await conn.execute(`SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE CONFERENCE_ID = :id AND STATUS = 'checked-in'`, { id: confId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return { total: Number(((total.rows as any[])[0] as any).CNT), checked: Number(((checked.rows as any[])[0] as any).CNT) };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function sessionEngagement(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = Number(req.params.id);
    const data = await withConn(async (conn) => {
      const messages = await conn.execute(`SELECT COUNT(*) AS CNT FROM MESSAGES WHERE SESSION_ID = :id`, { id: sessionId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return { messages: Number(((messages.rows as any[])[0] as any).CNT) };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}

export async function networking(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withConn(async (conn) => {
      const matches = await conn.execute(`SELECT COUNT(*) AS CNT FROM MATCHES`, {}, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const messages = await conn.execute(`SELECT COUNT(*) AS CNT FROM MESSAGES`, {}, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return { matches: Number(((matches.rows as any[])[0] as any).CNT), messages: Number(((messages.rows as any[])[0] as any).CNT) };
    });
    res.json(ok(data));
  } catch (e) { next(e); }
}





