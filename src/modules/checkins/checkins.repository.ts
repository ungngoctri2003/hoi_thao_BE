import { withConn, withTransaction } from '../../config/db'
import oracledb from 'oracledb';
import { registrationsRepository } from '../registrations/registrations.repository';

export type CheckinRow = {
  ID: number;
  REGISTRATION_ID: number;
  SESSION_ID?: number | null; // Optional: for session-specific check-ins
  CHECKIN_TIME: Date;
  METHOD: 'qr' | 'manual';
  STATUS: 'success' | 'duplicate' | 'error';
};

export const checkinsRepository = {
  async scanByQr(qrCode: string, sessionId?: number | null) {
    return withTransaction(async (conn) => {
      const reg = await registrationsRepository.findByQr(qrCode);
      if (!reg) throw Object.assign(new Error('Registration not found'), { status: 404 });
      
      // Check for recent check-in (within 1 day) for the same session
      let recentQuery = `SELECT ID FROM CHECKINS WHERE REGISTRATION_ID = :regId AND CHECKIN_TIME > SYSTIMESTAMP - INTERVAL '1' DAY`;
      const binds: any = { regId: reg.ID };
      
      if (sessionId) {
        recentQuery += ` AND SESSION_ID = :sessionId`;
        binds.sessionId = sessionId;
      } else {
        recentQuery += ` AND SESSION_ID IS NULL`;
      }
      
      recentQuery += ` ORDER BY CHECKIN_TIME DESC FETCH FIRST 1 ROWS ONLY`;
      
      const recent = await conn.execute(recentQuery, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const isDup = (recent.rows as any[]).length > 0;
      const status = isDup ? 'duplicate' : 'success';
      
      // Insert check-in with session ID
      const insertBinds: any = { 
        regId: reg.ID, 
        status, 
        sessionId: sessionId || null,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } 
      };
      
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, SESSION_ID, METHOD, STATUS) VALUES (:regId, :sessionId, 'qr', :status) RETURNING ID INTO :ID`,
        insertBinds
      );
      
      if (!isDup) {
        await conn.execute(`UPDATE REGISTRATIONS SET STATUS = 'checked-in' WHERE ID = :id`, { id: reg.ID });
      }
      
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT c.ID, c.REGISTRATION_ID, c.SESSION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS,
                a.NAME as ATTENDEE_NAME, a.EMAIL as ATTENDEE_EMAIL, a.PHONE as ATTENDEE_PHONE,
                r.QR_CODE, r.CONFERENCE_ID
         FROM CHECKINS c
         JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
         JOIN ATTENDEES a ON a.ID = r.ATTENDEE_ID
         WHERE c.ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return ((row.rows as any[])[0]) as CheckinRow;
    });
  },

  async manual(registrationId: number, sessionId?: number | null) {
    return withTransaction(async (conn) => {
      // Check for recent check-in (within 1 day) for the same session
      let recentQuery = `SELECT ID FROM CHECKINS WHERE REGISTRATION_ID = :regId AND CHECKIN_TIME > SYSTIMESTAMP - INTERVAL '1' DAY`;
      const binds: any = { regId: registrationId };
      
      if (sessionId) {
        recentQuery += ` AND SESSION_ID = :sessionId`;
        binds.sessionId = sessionId;
      } else {
        recentQuery += ` AND SESSION_ID IS NULL`;
      }
      
      recentQuery += ` ORDER BY CHECKIN_TIME DESC FETCH FIRST 1 ROWS ONLY`;
      
      const recent = await conn.execute(recentQuery, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const isDup = (recent.rows as any[]).length > 0;
      const status = isDup ? 'duplicate' : 'success';
      
      const insertBinds: any = {
        regId: registrationId,
        sessionId: sessionId || null,
        status,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };
      
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, SESSION_ID, METHOD, STATUS) VALUES (:regId, :sessionId, 'manual', :status) RETURNING ID INTO :ID`,
        insertBinds
      );
      
      if (!isDup) {
        await conn.execute(`UPDATE REGISTRATIONS SET STATUS = 'checked-in' WHERE ID = :id`, { id: registrationId });
      }
      
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT c.ID, c.REGISTRATION_ID, c.SESSION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS,
                a.NAME as ATTENDEE_NAME, a.EMAIL as ATTENDEE_EMAIL, a.PHONE as ATTENDEE_PHONE,
                r.QR_CODE, r.CONFERENCE_ID
         FROM CHECKINS c
         JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
         JOIN ATTENDEES a ON a.ID = r.ATTENDEE_ID
         WHERE c.ID = :id`,
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
             SELECT c.ID, c.REGISTRATION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS,
                    a.NAME as ATTENDEE_NAME, a.EMAIL as ATTENDEE_EMAIL, a.PHONE as ATTENDEE_PHONE,
                    reg.QR_CODE, r.CONFERENCE_ID
             FROM CHECKINS c 
             JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID 
             JOIN ATTENDEES a ON a.ID = r.ATTENDEE_ID
             LEFT JOIN REGISTRATIONS reg ON reg.ID = c.REGISTRATION_ID
             WHERE ${where} ORDER BY c.CHECKIN_TIME DESC
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
  },

  async verifyQrForDelete(checkInId: number, qrCode: string) {
    return withTransaction(async (conn) => {
      const result = await conn.execute(
        `SELECT c.ID, r.QR_CODE 
         FROM CHECKINS c
         JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
         WHERE c.ID = :checkInId`,
        { checkInId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const checkin = (result.rows as any[])[0];
      if (!checkin) {
        return { valid: false, message: 'Check-in record not found' };
      }
      
      if (checkin.QR_CODE !== qrCode) {
        return { valid: false, message: 'QR code does not match' };
      }
      
      return { valid: true, message: 'QR code verified' };
    });
  },

  async delete(id: number) {
    return withTransaction(async (conn) => {
      // First get the check-in record to find the registration ID
      const checkinRes = await conn.execute(
        `SELECT REGISTRATION_ID FROM CHECKINS WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const checkin = (checkinRes.rows as any[])[0];
      if (!checkin) {
        throw Object.assign(new Error('Check-in record not found'), { status: 404 });
      }
      
      // Delete the check-in record
      await conn.execute(
        `DELETE FROM CHECKINS WHERE ID = :id`,
        { id }
      );
      
      // Update registration status back to 'registered'
      await conn.execute(
        `UPDATE REGISTRATIONS SET STATUS = 'registered' WHERE ID = :regId`,
        { regId: checkin.REGISTRATION_ID }
      );
      
      return { success: true, message: 'Check-in record deleted successfully' };
    });
  }
};






