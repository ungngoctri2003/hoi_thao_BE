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
      // Define valid fields for ATTENDEES table
      const validFields = [
        'NAME', 'EMAIL', 'PHONE', 'COMPANY', 'POSITION', 'AVATAR_URL', 
        'DIETARY', 'SPECIAL_NEEDS', 'DATE_OF_BIRTH', 'GENDER', 'FIREBASE_UID'
      ];
      
      // Prepare data with proper type handling for Oracle
      const processedData: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip invalid fields that don't exist in ATTENDEES table
        if (!validFields.includes(key)) {
          console.warn(`Skipping invalid field for ATTENDEES table: ${key}`);
          continue;
        }
        
        if (value !== undefined && value !== null) {
          if (key === 'DATE_OF_BIRTH') {
            processedData[key] = new Date(value);
          } else if (typeof value === 'string') {
            processedData[key] = String(value);
          } else if (typeof value === 'boolean') {
            processedData[key] = value ? '1' : '0';
          } else {
            processedData[key] = value;
          }
        } else {
          processedData[key] = null;
        }
      }
      
      console.log('Create data:', processedData);
      
      const res = await conn.execute(
        `INSERT INTO ATTENDEES (NAME, EMAIL, PHONE, COMPANY, POSITION, AVATAR_URL, DIETARY, SPECIAL_NEEDS, DATE_OF_BIRTH, GENDER, FIREBASE_UID)
         VALUES (:NAME, :EMAIL, :PHONE, :COMPANY, :POSITION, :AVATAR_URL, :DIETARY, :SPECIAL_NEEDS, :DATE_OF_BIRTH, :GENDER, :FIREBASE_UID)
         RETURNING ID INTO :ID`,
        { ...processedData, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
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
      
      // Define valid fields for ATTENDEES table
      const validFields = [
        'NAME', 'EMAIL', 'PHONE', 'COMPANY', 'POSITION', 'AVATAR_URL', 
        'DIETARY', 'SPECIAL_NEEDS', 'DATE_OF_BIRTH', 'GENDER', 'FIREBASE_UID'
      ];
      
      for (const key of Object.keys(data)) {
        // Skip invalid fields that don't exist in ATTENDEES table
        if (!validFields.includes(key)) {
          console.warn(`Skipping invalid field for ATTENDEES table: ${key}`);
          continue;
        }
        
        const value = (data as Record<string, any>)[key];
        if (value !== undefined && value !== null) {
          fields.push(`${key} = :${key}`);
          
          // Handle different data types for Oracle with proper type conversion
          if (key === 'DATE_OF_BIRTH') {
            // Convert to proper Date object for Oracle
            if (value instanceof Date) {
              (binds as Record<string, any>)[key] = value;
            } else if (typeof value === 'string') {
              (binds as Record<string, any>)[key] = new Date(value);
            } else {
              (binds as Record<string, any>)[key] = new Date(value);
            }
          } else if (key === 'ID' || key === 'ATTENDEE_ID' || key === 'CONFERENCE_ID') {
            // Ensure numbers are properly typed and not NaN
            const numValue = Number(value);
            if (isNaN(numValue)) {
              console.warn(`Invalid number value for ${key}:`, value);
              continue; // Skip this field if it's not a valid number
            }
            (binds as Record<string, any>)[key] = numValue;
          } else if (typeof value === 'string') {
            // Ensure strings are properly handled and not empty if required
            (binds as Record<string, any>)[key] = String(value).trim();
          } else if (typeof value === 'boolean') {
            // Convert boolean to number for Oracle (0 or 1)
            (binds as Record<string, any>)[key] = value ? 1 : 0;
          } else if (value === null) {
            // Handle null values explicitly
            (binds as Record<string, any>)[key] = null;
          } else {
            // For any other type, convert to string as fallback
            (binds as Record<string, any>)[key] = String(value);
          }
        }
      }
      
      if (fields.length === 0) return this.findById(id);
      
      console.log('Update query:', `UPDATE ATTENDEES SET ${fields.join(', ')} WHERE ID = :id`);
      console.log('Bind parameters:', JSON.stringify(binds, null, 2));
      console.log('Bind parameter types:', Object.keys(binds).map(key => `${key}: ${typeof binds[key]}`));
      
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
  },

  async listByConference(conferenceId: number, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT a.ID, a.NAME, a.EMAIL, a.PHONE, a.COMPANY, a.POSITION, a.AVATAR_URL, a.DIETARY, a.SPECIAL_NEEDS, a.DATE_OF_BIRTH, a.GENDER, a.CREATED_AT, r.STATUS as REGISTRATION_STATUS
             FROM ATTENDEES a
             INNER JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
             WHERE r.CONFERENCE_ID = :conferenceId
             ORDER BY a.CREATED_AT DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { conferenceId, maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT 
         FROM ATTENDEES a
         INNER JOIN REGISTRATIONS r ON a.ID = r.ATTENDEE_ID
         WHERE r.CONFERENCE_ID = :conferenceId`,
        { conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows: rows as AttendeeRow[], total };
    });
  }
};


