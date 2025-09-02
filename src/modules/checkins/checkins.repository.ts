import { withConn, withTransaction } from '../../config/db'
import oracledb from 'oracledb';
import { registrationsRepository } from '../registrations/registrations.repository';

export type CheckinRow = {
  ID: number;
  REGISTRATION_ID: number;
  CHECKIN_TIME: Date;
  METHOD: 'qr' | 'manual';
  STATUS: 'success' | 'duplicate' | 'error';
};

export const checkinsRepository = {
  async scanByQr(qrCode: string) {
    return withTransaction(async (conn) => {
      const reg = await registrationsRepository.findByQr(qrCode);
      if (!reg) throw Object.assign(new Error('Registration not found'), { status: 404 });
      const recent = await conn.execute(
        `SELECT ID FROM CHECKINS WHERE REGISTRATION_ID = :regId AND CHECKIN_TIME > SYSTIMESTAMP - INTERVAL '1' DAY ORDER BY CHECKIN_TIME DESC FETCH FIRST 1 ROWS ONLY`,
        { regId: reg.ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const isDup = (recent.rows as any[]).length > 0;
      const status = isDup ? 'duplicate' : 'success';
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, METHOD, STATUS) VALUES (:regId, 'qr', :status) RETURNING ID INTO :ID`,
        { regId: reg.ID, status, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
      );
      if (!isDup) {
        await conn.execute(`UPDATE REGISTRATIONS SET STATUS = 'checked-in' WHERE ID = :id`, { id: reg.ID });
      }
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT ID, REGISTRATION_ID, CHECKIN_TIME, METHOD, STATUS FROM CHECKINS WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return ((row.rows as any[])[0]) as CheckinRow;
    });
  },

  async manual(registrationId: number) {
    return withTransaction(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, METHOD, STATUS) VALUES (:regId, 'manual', 'success') RETURNING ID INTO :ID`,
        { regId: registrationId, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
      );
      await conn.execute(`UPDATE REGISTRATIONS SET STATUS = 'checked-in' WHERE ID = :id`, { id: registrationId });
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT ID, REGISTRATION_ID, CHECKIN_TIME, METHOD, STATUS FROM CHECKINS WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return ((row.rows as any[])[0]) as CheckinRow;
    });
  },

  async list(params: { conferenceId?: number; attendeeId?: number; page: number; limit: number; }) {
    const { page, limit } = params; const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const binds: any = {};
      let where = '1=1';
      if (params.conferenceId) { where += ' AND r.CONFERENCE_ID = :conferenceId'; binds.conferenceId = params.conferenceId; }
      if (params.attendeeId) { where += ' AND r.ATTENDEE_ID = :attendeeId'; binds.attendeeId = params.attendeeId; }
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT c.ID, c.REGISTRATION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS
             FROM CHECKINS c JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID WHERE ${where} ORDER BY c.CHECKIN_TIME DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { ...binds, maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM CHECKINS c JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID WHERE ${where}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows: rows as CheckinRow[], total };
    });
  }
};






