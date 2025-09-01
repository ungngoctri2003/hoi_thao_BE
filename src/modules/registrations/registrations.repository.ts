import { withConn, withTransaction } from '../../config/db';
import { generateRegistrationQr } from '../../utils/qr';

export type RegistrationRow = {
  ID: number;
  ATTENDEE_ID: number;
  CONFERENCE_ID: number;
  REGISTRATION_DATE: Date;
  STATUS: 'registered' | 'checked-in' | 'cancelled' | 'no-show';
  QR_CODE: string | null;
};

export const registrationsRepository = {
  async list(params: { attendeeId?: number; conferenceId?: number; status?: string; page: number; limit: number; }) {
    const { page, limit } = params; const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const binds: any = {};
      let where = '1=1';
      if (params.attendeeId) { where += ' AND ATTENDEE_ID = :attendeeId'; binds.attendeeId = params.attendeeId; }
      if (params.conferenceId) { where += ' AND CONFERENCE_ID = :conferenceId'; binds.conferenceId = params.conferenceId; }
      if (params.status) { where += ' AND STATUS = :status'; binds.status = params.status; }
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE
             FROM REGISTRATIONS WHERE ${where} ORDER BY REGISTRATION_DATE DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { ...binds, maxRow: offset + limit, minRow: offset },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM REGISTRATIONS WHERE ${where}`,
        binds,
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number(((countRes.rows as any[])[0] as any).CNT);
      return { rows: rows as RegistrationRow[], total };
    });
  },

  async findById(id: number): Promise<RegistrationRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE FROM REGISTRATIONS WHERE ID = :id`,
        { id },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as RegistrationRow) || null;
    });
  },

  async create(data: { ATTENDEE_ID: number; CONFERENCE_ID: number; }) {
    return withTransaction(async (conn) => {
      // Generate unique QR, retry on conflict
      for (let i = 0; i < 5; i++) {
        const qr = generateRegistrationQr(data.CONFERENCE_ID, data.ATTENDEE_ID);
        try {
          const res = await conn.execute(
            `INSERT INTO REGISTRATIONS (ATTENDEE_ID, CONFERENCE_ID, STATUS, QR_CODE)
             VALUES (:ATTENDEE_ID, :CONFERENCE_ID, 'registered', :QR_CODE)
             RETURNING ID INTO :ID`,
            { ...data, QR_CODE: qr, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } }
          );
          const id = (res.outBinds as any).ID[0];
          const created = await conn.execute(
            `SELECT ID, ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE FROM REGISTRATIONS WHERE ID = :id`,
            { id },
            { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
          );
          return ((created.rows as any[])[0]) as RegistrationRow;
        } catch (e: any) {
          const msg = String(e && e.message || '');
          const isUniqueViolation = msg.includes('UQ_REG_QR_CODE') || msg.includes('unique');
          if (!isUniqueViolation) throw e;
        }
      }
      throw new Error('Failed to generate unique QR code');
    });
  },

  async update(id: number, status: RegistrationRow['STATUS']) {
    return withConn(async (conn) => {
      await conn.execute(`UPDATE REGISTRATIONS SET STATUS = :status WHERE ID = :id`, { status, id }, { autoCommit: true });
      const res = await conn.execute(
        `SELECT ID, ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE FROM REGISTRATIONS WHERE ID = :id`,
        { id },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as RegistrationRow) || null;
    });
  },

  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM REGISTRATIONS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },

  async findByQr(qr: string): Promise<RegistrationRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, ATTENDEE_ID, CONFERENCE_ID, REGISTRATION_DATE, STATUS, QR_CODE FROM REGISTRATIONS WHERE QR_CODE = :qr`,
        { qr },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as RegistrationRow) || null;
    });
  }
};





