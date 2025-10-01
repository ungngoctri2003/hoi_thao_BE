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
  ACTION_TYPE?: 'checkin' | 'checkout'; // Type of action: checkin (entry) or checkout (exit)
};

export const checkinsRepository = {
  async scanByQr(qrCode: string, sessionId?: number | null, actionType: 'checkin' | 'checkout' = 'checkin') {
    return withTransaction(async (conn) => {
      const reg = await registrationsRepository.findByQr(qrCode);
      if (!reg) throw Object.assign(new Error('Registration not found'), { status: 404 });
      
      // Check if there's any checkout record - if yes, cannot check-in again
      if (actionType === 'checkin') {
        let checkoutQuery = `SELECT ID FROM CHECKINS WHERE REGISTRATION_ID = :regId AND ACTION_TYPE = 'checkout'`;
        const checkoutBinds: any = { regId: reg.ID };
        
        if (sessionId) {
          checkoutQuery += ` AND SESSION_ID = :sessionId`;
          checkoutBinds.sessionId = sessionId;
        } else {
          checkoutQuery += ` AND SESSION_ID IS NULL`;
        }
        
        const checkoutResult = await conn.execute(checkoutQuery, checkoutBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if ((checkoutResult.rows as any[]).length > 0) {
          throw Object.assign(new Error('Bạn đã check-out rồi! Không thể check-in lại.'), { status: 400 });
        }
      }
      
      // Check the last action to validate current action
      let lastActionQuery = `SELECT ACTION_TYPE FROM CHECKINS WHERE REGISTRATION_ID = :regId`;
      const lastActionBinds: any = { regId: reg.ID };
      
      if (sessionId) {
        lastActionQuery += ` AND SESSION_ID = :sessionId`;
        lastActionBinds.sessionId = sessionId;
      } else {
        lastActionQuery += ` AND SESSION_ID IS NULL`;
      }
      
      lastActionQuery += ` ORDER BY CHECKIN_TIME DESC FETCH FIRST 1 ROWS ONLY`;
      
      const lastActionResult = await conn.execute(lastActionQuery, lastActionBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if ((lastActionResult.rows as any[]).length > 0) {
        const lastAction = (lastActionResult.rows as any[])[0].ACTION_TYPE;
        
        // Cannot check-in if already checked in (duplicate check-in)
        if (actionType === 'checkin' && lastAction === 'checkin') {
          throw Object.assign(new Error('Bạn đã check-in rồi! Vui lòng check-out trước.'), { status: 400 });
        }
        
        // Cannot check-out if already checked out (duplicate check-out)
        if (actionType === 'checkout' && lastAction === 'checkout') {
          throw Object.assign(new Error('Bạn đã check-out rồi!'), { status: 400 });
        }
        
        // Must check-in before check-out
        if (actionType === 'checkout' && lastAction !== 'checkin') {
          throw Object.assign(new Error('Không thể check-out! Bạn phải check-in trước.'), { status: 400 });
        }
      } else {
        // No previous action, can only check-in
        if (actionType === 'checkout') {
          throw Object.assign(new Error('Không thể check-out! Bạn phải check-in trước.'), { status: 400 });
        }
      }
      
      const status = 'success';
      
      // Insert check-in/checkout with session ID and action type
      const insertBinds: any = { 
        regId: reg.ID, 
        status, 
        sessionId: sessionId || null,
        actionType,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } 
      };
      
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, SESSION_ID, METHOD, STATUS, ACTION_TYPE) VALUES (:regId, :sessionId, 'qr', :status, :actionType) RETURNING ID INTO :ID`,
        insertBinds
      );
      
      // Update registration status based on action type
      const newStatus = actionType === 'checkin' ? 'checked-in' : 'checked-out';
      await conn.execute(`UPDATE REGISTRATIONS SET STATUS = :status WHERE ID = :id`, { status: newStatus, id: reg.ID });
      
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT c.ID, c.REGISTRATION_ID, c.SESSION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS, c.ACTION_TYPE,
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

  async manual(registrationId: number, sessionId?: number | null, actionType: 'checkin' | 'checkout' = 'checkin') {
    return withTransaction(async (conn) => {
      // Check if there's any checkout record - if yes, cannot check-in again
      if (actionType === 'checkin') {
        let checkoutQuery = `SELECT ID FROM CHECKINS WHERE REGISTRATION_ID = :regId AND ACTION_TYPE = 'checkout'`;
        const checkoutBinds: any = { regId: registrationId };
        
        if (sessionId) {
          checkoutQuery += ` AND SESSION_ID = :sessionId`;
          checkoutBinds.sessionId = sessionId;
        } else {
          checkoutQuery += ` AND SESSION_ID IS NULL`;
        }
        
        const checkoutResult = await conn.execute(checkoutQuery, checkoutBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if ((checkoutResult.rows as any[]).length > 0) {
          throw Object.assign(new Error('Bạn đã check-out rồi! Không thể check-in lại.'), { status: 400 });
        }
      }
      
      // Check the last action to validate current action
      let lastActionQuery = `SELECT ACTION_TYPE FROM CHECKINS WHERE REGISTRATION_ID = :regId`;
      const lastActionBinds: any = { regId: registrationId };
      
      if (sessionId) {
        lastActionQuery += ` AND SESSION_ID = :sessionId`;
        lastActionBinds.sessionId = sessionId;
      } else {
        lastActionQuery += ` AND SESSION_ID IS NULL`;
      }
      
      lastActionQuery += ` ORDER BY CHECKIN_TIME DESC FETCH FIRST 1 ROWS ONLY`;
      
      const lastActionResult = await conn.execute(lastActionQuery, lastActionBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      
      if ((lastActionResult.rows as any[]).length > 0) {
        const lastAction = (lastActionResult.rows as any[])[0].ACTION_TYPE;
        
        // Cannot check-in if already checked in (duplicate check-in)
        if (actionType === 'checkin' && lastAction === 'checkin') {
          throw Object.assign(new Error('Bạn đã check-in rồi! Vui lòng check-out trước.'), { status: 400 });
        }
        
        // Cannot check-out if already checked out (duplicate check-out)
        if (actionType === 'checkout' && lastAction === 'checkout') {
          throw Object.assign(new Error('Bạn đã check-out rồi!'), { status: 400 });
        }
        
        // Must check-in before check-out
        if (actionType === 'checkout' && lastAction !== 'checkin') {
          throw Object.assign(new Error('Không thể check-out! Bạn phải check-in trước.'), { status: 400 });
        }
      } else {
        // No previous action, can only check-in
        if (actionType === 'checkout') {
          throw Object.assign(new Error('Không thể check-out! Bạn phải check-in trước.'), { status: 400 });
        }
      }
      
      const status = 'success';
      
      const insertBinds: any = {
        regId: registrationId,
        sessionId: sessionId || null,
        actionType,
        status,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };
      
      const res = await conn.execute(
        `INSERT INTO CHECKINS (REGISTRATION_ID, SESSION_ID, METHOD, STATUS, ACTION_TYPE) VALUES (:regId, :sessionId, 'manual', :status, :actionType) RETURNING ID INTO :ID`,
        insertBinds
      );
      
      // Update registration status based on action type
      const newStatus = actionType === 'checkin' ? 'checked-in' : 'checked-out';
      await conn.execute(`UPDATE REGISTRATIONS SET STATUS = :status WHERE ID = :id`, { status: newStatus, id: registrationId });
      
      const id = (res.outBinds as { ID: number[] }).ID[0];
      const row = await conn.execute(
        `SELECT c.ID, c.REGISTRATION_ID, c.SESSION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS, c.ACTION_TYPE,
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
             SELECT c.ID, c.REGISTRATION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS, c.ACTION_TYPE,
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






