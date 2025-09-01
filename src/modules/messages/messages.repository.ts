import { withConn } from '../../config/db';

export type MessageRow = {
  ID: number;
  SESSION_ID: number | null;
  ATTENDEE_ID: number | null;
  TS: Date;
  TYPE: 'text' | 'image' | 'file';
  CONTENT: string | null;
};

export const messagesRepository = {
  async listBySession(sessionId: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, SESSION_ID, ATTENDEE_ID, TS, TYPE, CONTENT
             FROM MESSAGES WHERE SESSION_ID = :sessionId ORDER BY TS DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { sessionId, maxRow: offset + limit, minRow: offset },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM MESSAGES WHERE SESSION_ID = :sessionId`,
        { sessionId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number(((countRes.rows as any[])[0] as any).CNT);
      return { rows: rows as MessageRow[], total };
    });
  },

  async create(sessionId: number, attendeeId: number | null, type: MessageRow['TYPE'], content: string) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO MESSAGES (SESSION_ID, ATTENDEE_ID, TYPE, CONTENT) VALUES (:sessionId, :attendeeId, :type, :content) RETURNING ID INTO :ID`,
        { sessionId, attendeeId, type, content, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      const id = (res.outBinds as any).ID[0];
      const row = await conn.execute(
        `SELECT ID, SESSION_ID, ATTENDEE_ID, TS, TYPE, CONTENT FROM MESSAGES WHERE ID = :id`,
        { id },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return ((row.rows as any[])[0]) as MessageRow;
    });
  }
};





