import { Request, Response, NextFunction } from 'express';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';

function computeBadges(data: { messages: number; checkins: number; sessionsSpoken: number; }) {
  const badges: string[] = [];
  if (data.checkins > 0) badges.push('First Check-in');
  if (data.sessionsSpoken > 0) badges.push('Active Speaker');
  if (data.messages >= 10) badges.push('Networker');
  return badges;
}

export async function getBadges(req: Request, res: Response, next: NextFunction) {
  try {
    const attendeeId = Number(req.params.id);
    const stats = await withConn(async (conn) => {
      const messages = await conn.execute(`SELECT COUNT(*) AS CNT FROM MESSAGES WHERE ATTENDEE_ID = :id`, { id: attendeeId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const checkins = await conn.execute(`SELECT COUNT(*) AS CNT FROM CHECKINS c JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID WHERE r.ATTENDEE_ID = :id`, { id: attendeeId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      // No direct schema for speaker; naive heuristic: sessions where speaker name matches attendee name
      const attendee = await conn.execute(`SELECT NAME FROM ATTENDEES WHERE ID = :id`, { id: attendeeId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const name = String(((attendee.rows as any[])[0] as any)?.NAME || '');
      const sessions = await conn.execute(`SELECT COUNT(*) AS CNT FROM SESSIONS WHERE SPEAKER = :name`, { name }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return {
        messages: Number(((messages.rows as any[])[0] as any).CNT),
        checkins: Number(((checkins.rows as any[])[0] as any).CNT),
        sessionsSpoken: Number(((sessions.rows as any[])[0] as any).CNT)
      };
    });
    res.json(ok({ badges: computeBadges(stats), stats }));
  } catch (e) { next(e); }
}

export async function evaluateBadges(_req: Request, res: Response) {
  // Just a stub to trigger evaluation; audit is already handled globally
  res.json(ok({ evaluated: true }));
}





