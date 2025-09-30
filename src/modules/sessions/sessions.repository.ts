import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export type SessionRow = {
  ID: number;
  CONFERENCE_ID: number;
  ROOM_ID: number | null;
  ROOM_NAME?: string | null;
  TITLE: string;
  SPEAKER: string | null;
  START_TIME: Date;
  END_TIME: Date;
  STATUS: 'upcoming' | 'live' | 'active' | 'completed' | 'ended';
  DESCRIPTION: string | null;
};

// Helper function to clean session data and remove circular references
function cleanSessionData(row: any): SessionRow | null {
  if (!row) return null;

  // Handle DESCRIPTION field - convert Lob to string if it's a Lob object
  let description = row.DESCRIPTION;
  if (
    description &&
    typeof description === 'object' &&
    description.constructor &&
    description.constructor.name === 'Lob'
  ) {
    // For Lob objects, we need to read the content asynchronously
    // For now, we'll set it to null to avoid circular reference issues
    // In a real implementation, you'd want to read the Lob content
    description = null;
  }

  return {
    ID: row.ID,
    CONFERENCE_ID: row.CONFERENCE_ID,
    ROOM_ID: row.ROOM_ID,
    ROOM_NAME: row.ROOM_NAME,
    TITLE: row.TITLE,
    SPEAKER: row.SPEAKER,
    START_TIME: row.START_TIME,
    END_TIME: row.END_TIME,
    STATUS: row.STATUS,
    DESCRIPTION: description,
  };
}

export const sessionsRepository = {
  async list(confId: number, filters: { status?: string; roomId?: number } | undefined) {
    return withConn(async conn => {
      const binds: any = { confId };
      let where = 's.CONFERENCE_ID = :confId';
      if (filters?.status) {
        where += ' AND s.STATUS = :status';
        binds.status = filters.status;
      }
      if (filters?.roomId) {
        where += ' AND s.ROOM_ID = :roomId';
        binds.roomId = filters.roomId;
      }
      const res = await conn.execute(
        `SELECT s.ID, s.CONFERENCE_ID, s.ROOM_ID, s.TITLE, s.SPEAKER, s.START_TIME, s.END_TIME, s.STATUS, s.DESCRIPTION,
                r.NAME as ROOM_NAME
         FROM SESSIONS s
         LEFT JOIN ROOMS r ON s.ROOM_ID = r.ID
         WHERE ${where} ORDER BY s.START_TIME NULLS LAST`,
        binds,
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { DESCRIPTION: { type: oracledb.STRING } },
        }
      );
      const rows = (res.rows as any[]) || [];
      return rows.map(row => cleanSessionData(row)).filter(Boolean) as SessionRow[];
    });
  },

  async listAll(filters: { conferenceId?: number; status?: string } | undefined) {
    return withConn(async conn => {
      const binds: any = {};
      let where = '1=1';
      if (filters?.conferenceId) {
        where += ' AND s.CONFERENCE_ID = :confId';
        binds.confId = filters.conferenceId;
      }
      if (filters?.status) {
        where += ' AND s.STATUS = :status';
        binds.status = filters.status;
      }
      const res = await conn.execute(
        `SELECT s.ID, s.CONFERENCE_ID, s.ROOM_ID, s.TITLE, s.SPEAKER, s.START_TIME, s.END_TIME, s.STATUS, s.DESCRIPTION,
                r.NAME as ROOM_NAME
         FROM SESSIONS s
         LEFT JOIN ROOMS r ON s.ROOM_ID = r.ID
         WHERE ${where} ORDER BY s.START_TIME NULLS LAST`,
        binds,
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { DESCRIPTION: { type: oracledb.STRING } },
        }
      );
      const rows = (res.rows as any[]) || [];
      return rows.map(row => cleanSessionData(row)).filter(Boolean) as SessionRow[];
    });
  },

  async findById(id: number): Promise<SessionRow | null> {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT s.ID, s.CONFERENCE_ID, s.ROOM_ID, s.TITLE, s.SPEAKER, s.START_TIME, s.END_TIME, s.STATUS, s.DESCRIPTION,
                r.NAME as ROOM_NAME
         FROM SESSIONS s
         LEFT JOIN ROOMS r ON s.ROOM_ID = r.ID
         WHERE s.ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      const row = rows[0];
      return cleanSessionData(row);
    });
  },

  async create(confId: number, data: Omit<SessionRow, 'ID' | 'CONFERENCE_ID'>) {
    return withConn(async conn => {
      // Convert string dates to Date objects if they are strings
      const startTime =
        typeof data.START_TIME === 'string' ? new Date(data.START_TIME) : data.START_TIME;
      const endTime = typeof data.END_TIME === 'string' ? new Date(data.END_TIME) : data.END_TIME;

      // Validate that both times are valid dates
      if (!startTime || isNaN(startTime.getTime())) {
        throw new Error('Invalid start time provided');
      }
      if (!endTime || isNaN(endTime.getTime())) {
        throw new Error('Invalid end time provided');
      }

      try {
        // Insert without specifying ID - let Oracle IDENTITY handle it
        await conn.execute(
          `INSERT INTO SESSIONS (CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION)
           VALUES (:conferenceId, :roomId, :title, :speaker, :startTime, :endTime, :status, :description)`,
          {
            conferenceId: confId,
            roomId: data.ROOM_ID || null,
            title: data.TITLE,
            speaker: data.SPEAKER || null,
            startTime: startTime,
            endTime: endTime,
            status: data.STATUS || 'upcoming',
            description: data.DESCRIPTION || null,
          },
          { autoCommit: true }
        );

        // Get the last inserted session for this conference
        const lastSessionResult = await conn.execute(
          `SELECT ID FROM SESSIONS WHERE CONFERENCE_ID = :conferenceId ORDER BY ID DESC FETCH FIRST 1 ROWS ONLY`,
          { conferenceId: confId }
        );

        const rows = lastSessionResult.rows as any[] | undefined;
        if (!rows || rows.length === 0) throw new Error('Failed to get created session ID');

        const lastSession = rows[0] as any[];
        const sessionId = lastSession[0];
        if (!sessionId) throw new Error('Failed to get created session ID');

        return this.findById(sessionId);
      } catch (error) {
        throw error;
      }
    });
  },

  async update(id: number, data: Partial<Omit<SessionRow, 'ID' | 'CONFERENCE_ID'>>) {
    return withConn(async conn => {
      const fields: string[] = [];
      const binds: any = { id };
      for (const key of Object.keys(data)) {
        fields.push(`${key} = :${key}`);
        binds[key] = (data as Record<string, any>)[key];
      }

      if (fields.length === 0) {
        // If no fields to update, get current data directly
        const res = await conn.execute(
          `SELECT ID, CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION FROM SESSIONS WHERE ID = :id`,
          { id },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const rows = (res.rows as any[]) || [];
        const row = rows[0];
        return cleanSessionData(row);
      }

      await conn.execute(`UPDATE SESSIONS SET ${fields.join(', ')} WHERE ID = :id`, binds, {
        autoCommit: true,
      });

      // Get the updated data directly from the database to avoid circular references
      const res = await conn.execute(
        `SELECT ID, CONFERENCE_ID, ROOM_ID, TITLE, SPEAKER, START_TIME, END_TIME, STATUS, DESCRIPTION FROM SESSIONS WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const rows = (res.rows as any[]) || [];
      const row = rows[0];
      return cleanSessionData(row);
    });
  },

  async assignRoom(id: number, roomId: number) {
    return withConn(async conn => {
      await conn.execute(
        `UPDATE SESSIONS SET ROOM_ID = :room WHERE ID = :id`,
        { room: roomId, id },
        { autoCommit: true }
      );
      return this.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async conn => {
      await conn.execute(`DELETE FROM SESSIONS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },
};
