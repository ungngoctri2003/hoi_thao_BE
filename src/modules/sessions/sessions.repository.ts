import { withConn } from '../../config/db';

export type SessionRow = {
  ID: number;
  CONFERENCE_ID: number;
  ROOM_ID: number | null;
  TITLE: string;
  SPEAKER: string | null;
  START_TIME: Date | null;
  END_TIME: Date | null;
  STATUS: 'upcoming' | 'live' | 'active' | 'completed' | 'ended';
  DESCRIPTION: string | null;
};

export const sessionsRepository = {
  async list(confId: number, filters: { status?: string, roomId?: number } | undefined) {
    return withConn(async (conn) => {
      const binds: any = { confId };
      let where = 'CONFERENCE_ID = :confId';
      if (filters?.status) { where += ' AND STATUS = :status'; binds.status = filters.status; }
      if (filters?.roomId) { where += ' AND ROOM_ID = :roomId'; binds.roomId = filters.roomId; }
      const res = await conn.execute(
        `SELECT ID, CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION
         FROM SESSIONS WHERE ${where} ORDER BY START_TIME NULLS LAST`,
        binds,
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) as SessionRow[];
    });
  },

  async findById(id: number): Promise<SessionRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION FROM SESSIONS WHERE ID = :id`,
        { id },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as SessionRow) || null;
    });
  },

  async create(confId: number, data: Omit<SessionRow, 'ID' | 'CONFERENCE_ID'>) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO SESSIONS (CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION)
         VALUES (:conf, :room, :title, :speaker, :start, :end, :status, :desc) RETURNING ID INTO :ID`,
        {
          conf: confId,
          room: data.ROOM_ID || null,
          title: data.TITLE,
          speaker: data.SPEAKER || null,
          start: data.START_TIME || null,
          end: data.END_TIME || null,
          status: data.STATUS || 'upcoming',
          desc: data.DESCRIPTION || null,
          ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER }
        },
        { autoCommit: true }
      );
      const id = (res.outBinds as any).ID[0];
      return this.findById(id);
    });
  },

  async update(id: number, data: Partial<Omit<SessionRow, 'ID' | 'CONFERENCE_ID'>>) {
    return withConn(async (conn) => {
      const fields: string[] = []; const binds: any = { id };
      for (const key of Object.keys(data)) { fields.push(`${key} = :${key}`); binds[key] = (data as any)[key]; }
      if (fields.length === 0) return this.findById(id);
      await conn.execute(`UPDATE SESSIONS SET ${fields.join(', ')} WHERE ID = :id`, binds, { autoCommit: true });
      return this.findById(id);
    });
  },

  async assignRoom(id: number, roomId: number) {
    return withConn(async (conn) => {
      await conn.execute(`UPDATE SESSIONS SET ROOM_ID = :room WHERE ID = :id`, { room: roomId, id }, { autoCommit: true });
      return this.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM SESSIONS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  }
};





