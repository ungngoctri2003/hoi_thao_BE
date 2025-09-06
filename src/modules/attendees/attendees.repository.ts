import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export type AttendeeRow = {
  ID: number;
  NAME: string;
  EMAIL: string;
  PHONE: string | null;
  COMPANY: string | null;
  POSITION: string | null;
  AVATAR_URL: string | null;
  DIETARY: string | null;
  SPECIAL_NEEDS: string | null;
  DATE_OF_BIRTH: Date | null;
  GENDER: string | null;
  FIREBASE_UID?: string | null;
  CREATED_AT: Date;
};

export const attendeesRepository = {
  async findByEmail(email: string): Promise<AttendeeRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, CREATED_AT FROM ATTENDEES WHERE EMAIL = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as AttendeeRow) || null;
    });
  },
  async list(params: { page: number; limit: number; filters?: Record<string, any>; search?: string | null; }) {
    const { page, limit, filters, search } = params;
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const binds: any = {};
      const whereClauses: string[] = ['1=1'];
      if (filters?.email) { whereClauses.push('LOWER(EMAIL) LIKE :email'); binds.email = `%${String(filters.email).toLowerCase()}%`; }
      if (filters?.name) { whereClauses.push('LOWER(NAME) LIKE :name'); binds.name = `%${String(filters.name).toLowerCase()}%`; }
      if (filters?.company) { whereClauses.push('LOWER(COMPANY) LIKE :company'); binds.company = `%${String(filters.company).toLowerCase()}%`; }
      if (filters?.gender) { whereClauses.push('GENDER = :gender'); binds.gender = String(filters.gender); }
      if (search) {
        whereClauses.push('(LOWER(NAME) LIKE :q OR LOWER(EMAIL) LIKE :q OR LOWER(COMPANY) LIKE :q)');
        binds.q = `%${String(search).toLowerCase()}%`;
      }
      const where = whereClauses.join(' AND ');

      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, CREATED_AT
             FROM ATTENDEES WHERE ${where} ORDER BY CREATED_AT DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { ...binds, maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM ATTENDEES WHERE ${where}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows: rows as AttendeeRow[], total };
    });
  },

  async findById(id: number): Promise<AttendeeRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, CREATED_AT
         FROM ATTENDEES WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as AttendeeRow) || null;
    });
  },

  async create(data: Omit<AttendeeRow, 'ID' | 'CREATED_AT'>): Promise<AttendeeRow> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO ATTENDEES (NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, FIREBASE_UID)
         VALUES (:NAME, :EMAIL, :PHONE, :COMPANY, :POSITION, :AVATAR_URL, :DIETARY, :SPECIAL_NEEDS, :DATE_OF_BIRTH, :GENDER, :FIREBASE_UID)
         RETURNING ID INTO :ID`,
        { ...data, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      const id = (res.outBinds as { ID: number[] }).ID[0];
      if (!id) throw new Error('Failed to get created ID');
      
      // Return the created attendee data directly instead of making another query
      const created = await conn.execute(
        `SELECT ID, NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, CREATED_AT
         FROM ATTENDEES WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (created.rows as any[]) || [];
      return (rows[0] as AttendeeRow);
    });
  },

  async update(id: number, data: Partial<Omit<AttendeeRow, 'ID' | 'CREATED_AT'>>) {
    return withConn(async (conn) => {
      const fields: string[] = [];
      const binds: any = { id };
      for (const key of Object.keys(data)) {
        fields.push(`${key} = :${key}`);
        (binds as Record<string, any>)[key] = (data as Record<string, any>)[key];
      }
      if (fields.length === 0) return this.findById(id);
      await conn.execute(
        `UPDATE ATTENDEES SET ${fields.join(', ')} WHERE ID = :id`,
        binds,
        { autoCommit: true }
      );
      return this.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM ATTENDEES WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },

  async listRegistrationsByAttendee(attendeeId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT r.ID, r.CONFERENCE_ID, r.STATUS, r.QR_CODE, r.REGISTRATION_DATE
         FROM REGISTRATIONS r WHERE r.ATTENDEE_ID = :attendeeId ORDER BY r.REGISTRATION_DATE DESC`,
        { attendeeId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async search(q: string, limit = 10) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, NAME, EMAIL, COMPANY FROM ATTENDEES
         WHERE LOWER(NAME) LIKE :q OR LOWER(EMAIL) LIKE :q OR LOWER(COMPANY) LIKE :q
         ORDER BY CREATED_AT DESC FETCH FIRST :limit ROWS ONLY`,
        { q: `%${q.toLowerCase()}%`, limit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async findByQRCodeAndConference(qrCode: string, conferenceId: number): Promise<AttendeeRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT a.ID, a.NAME, a.EMAIL, a.PHONE, a.COMPANY, a.POSITION, a.AVATAR_URL, a.DIETARY, a.SPECIAL_NEEDS, a.DATE_OF_BIRTH, a.GENDER, a.CREATED_AT
         FROM ATTENDEES a
         INNER JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         WHERE r.QR_CODE = :qrCode AND r.CONFERENCE_ID = :conferenceId`,
        { qrCode, conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as AttendeeRow) || null;
    });
  },

  async searchByQuery(query: string, conferenceId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT a.ID, a.NAME, a.EMAIL, a.PHONE, a.COMPANY, a.POSITION, a.AVATAR_URL, a.DIETARY, a.SPECIAL_NEEDS, a.DATE_OF_BIRTH, a.GENDER, a.CREATED_AT, r.QR_CODE, r.STATUS as REGISTRATION_STATUS
         FROM ATTENDEES a
         INNER JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         LEFT JOIN CHECKINS c ON c.REGISTRATION_ID = r.ID AND c.STATUS = 'success'
         WHERE r.CONFERENCE_ID = :conferenceId
         AND c.ID IS NULL
         AND (LOWER(a.NAME) LIKE :q OR LOWER(a.EMAIL) LIKE :q OR LOWER(a.PHONE) LIKE :q)
         ORDER BY a.CREATED_AT DESC`,
        { q: `%${query.toLowerCase()}%`, conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  }
};


