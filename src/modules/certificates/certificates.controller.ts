import { Request, Response, NextFunction } from 'express';
import { withConn } from '../../config/db';
import { ok } from '../../utils/responses';

export async function generateCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const { attendeeId, conferenceId } = req.body;
    const data = await withConn(async (conn) => {
      const attendee = await conn.execute(`SELECT ID, NAME, EMAIL FROM ATTENDEES WHERE ID = :id`, { id: attendeeId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      const conference = await conn.execute(`SELECT ID, NAME, START_DATE, END_DATE FROM CONFERENCES WHERE ID = :id`, { id: conferenceId }, { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT });
      return { attendee: (attendee.rows as any[])[0], conference: (conference.rows as any[])[0] };
    });
    // Stub: return a simple payload; real impl would generate PDF and return URL or buffer
    res.json(ok({ certificate: { attendee: data.attendee, conference: data.conference, issuedAt: new Date().toISOString() } }));
  } catch (e) { next(e); }
}





