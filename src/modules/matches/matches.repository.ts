import { withConn } from '../../config/db';

export type MatchRow = { ID: number; ATTENDEE_A_ID: number; ATTENDEE_B_ID: number; SCORE: number | null; CREATED_AT: Date };

export const matchesRepository = {
  async listByAttendee(attendeeId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, ATTENDEE_A_ID, ATTENDEE_B_ID, SCORE, CREATED_AT FROM MATCHES WHERE ATTENDEE_A_ID = :id OR ATTENDEE_B_ID = :id ORDER BY CREATED_AT DESC`,
        { id: attendeeId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) as MatchRow[];
    });
  },
  async create(a: number, b: number, score?: number) {
    return withConn(async (conn) => {
      const lesser = Math.min(a, b); const greater = Math.max(a, b);
      const res = await conn.execute(
        `INSERT INTO MATCHES (ATTENDEE_A_ID, ATTENDEE_B_ID, SCORE) VALUES (:a, :b, :score) RETURNING ID INTO :ID`,
        { a: lesser, b: greater, score: score ?? null, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as any).ID[0];
    });
  },
  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM MATCHES WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },
  async suggestions(attendeeId: number, limit = 10) {
    // Stub: return recent attendees by some heuristic; implement real scoring later
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, NAME, COMPANY FROM ATTENDEES WHERE ID <> :id ORDER BY CREATED_AT DESC FETCH FIRST :limit ROWS ONLY`,
        { id: attendeeId, limit },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  }
};





