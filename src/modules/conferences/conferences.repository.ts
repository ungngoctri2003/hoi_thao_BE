import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export type ConferenceRow = {
  ID: number;
  NAME: string;
  DESCRIPTION: string | null;
  START_DATE: Date | null;
  END_DATE: Date | null;
  LOCATION: string | null;
  CATEGORY: string | null;
  ORGANIZER: string | null;
  CAPACITY: number | null;
  STATUS: 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
  CREATED_AT: Date;
};

export const conferencesRepository = {
  async list(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async conn => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, NAME, DESCRIPTION, START_DATE, END_DATE, LOCATION, CATEGORY, ORGANIZER, CAPACITY, STATUS, CREATED_AT
             FROM CONFERENCES ORDER BY CREATED_AT DESC
           ) t WHERE ROWNUM <= :max_row
         ) WHERE rn > :min_row`,
        { max_row: offset + limit, min_row: offset },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { DESCRIPTION: { type: oracledb.STRING } },
        }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CONFERENCES`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      return { rows: rows as ConferenceRow[], total };
    });
  },

  async listByStatus(page: number, limit: number, status: ConferenceRow['STATUS']) {
    const offset = (page - 1) * limit;
    return withConn(async conn => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, NAME, DESCRIPTION, START_DATE, END_DATE, LOCATION, CATEGORY, ORGANIZER, CAPACITY, STATUS, CREATED_AT
             FROM CONFERENCES WHERE STATUS = :status ORDER BY CREATED_AT DESC
           ) t WHERE ROWNUM <= :max_row
         ) WHERE rn > :min_row`,
        { status, max_row: offset + limit, min_row: offset },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { DESCRIPTION: { type: oracledb.STRING } },
        }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CONFERENCES WHERE STATUS = :status`,
        { status },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{ CNT: number }>)[0]?.CNT || 0);
      return { rows: rows as ConferenceRow[], total };
    });
  },

  async findById(id: number): Promise<ConferenceRow | null> {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, NAME, DESCRIPTION, START_DATE, END_DATE, LOCATION, CATEGORY, ORGANIZER, CAPACITY, STATUS, CREATED_AT
         FROM CONFERENCES WHERE ID = :id`,
        { id },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { DESCRIPTION: { type: oracledb.STRING } },
        }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as ConferenceRow) || null;
    });
  },

  async create(
    data: Omit<ConferenceRow, 'ID' | 'STATUS' | 'CREATED_AT'> & { STATUS?: ConferenceRow['STATUS'] }
  ) {
    return withConn(async conn => {
      // Convert date strings to proper format for Oracle
      const formatDate = (dateStr: string) => {
        if (!dateStr) return null;
        // If it's already in ISO format, convert to Oracle date format
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        }
        // If it's in YYYY-MM-DD format, convert to Date object
        return new Date(dateStr + 'T00:00:00.000Z');
      };

      const res = await conn.execute(
        `INSERT INTO CONFERENCES (NAME, DESCRIPTION, START_DATE, END_DATE, LOCATION, CATEGORY, ORGANIZER, CAPACITY, STATUS)
         VALUES (:NAME, :DESCRIPTION, :START_DATE, :END_DATE, :LOCATION, :CATEGORY, :ORGANIZER, :CAPACITY, :STATUS)
         RETURNING ID INTO :id`,
        {
          ...data,
          START_DATE: data.START_DATE ? formatDate(data.START_DATE.toISOString()) : null,
          END_DATE: data.END_DATE ? formatDate(data.END_DATE.toISOString()) : null,
          STATUS: data.STATUS || 'draft',
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      const id = (res.outBinds as { id: number[] }).id[0];
      if (!id) throw new Error('Failed to get created ID');
      return this.findById(id);
    });
  },

  async update(id: number, data: Partial<Omit<ConferenceRow, 'ID' | 'CREATED_AT'>>) {
    return withConn(async conn => {
      // Convert date strings to proper format for Oracle
      const formatDate = (dateStr: string) => {
        if (!dateStr) return null;
        // If it's already in ISO format, convert to Oracle date format
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        }
        // If it's in YYYY-MM-DD format, convert to Date object
        return new Date(dateStr + 'T00:00:00.000Z');
      };

      const fields: string[] = [];
      const binds: any = { id };

      for (const key of Object.keys(data)) {
        fields.push(`${key} = :${key}`);
        const value = (data as Record<string, any>)[key];

        // Handle date fields specifically
        if (key === 'START_DATE' || key === 'END_DATE') {
          binds[key] = formatDate(value);
        } else {
          binds[key] = value;
        }
      }

      if (fields.length === 0) return this.findById(id);
      await conn.execute(`UPDATE CONFERENCES SET ${fields.join(', ')} WHERE ID = :id`, binds, {
        autoCommit: true,
      });
      return this.findById(id);
    });
  },

  async changeStatus(id: number, status: ConferenceRow['STATUS']) {
    return withConn(async conn => {
      await conn.execute(
        `UPDATE CONFERENCES SET STATUS = :status WHERE ID = :id`,
        { status, id },
        { autoCommit: true }
      );
      return this.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async conn => {
      await conn.execute(`DELETE FROM CONFERENCES WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },
};
