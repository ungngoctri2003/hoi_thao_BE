import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export const floorsRepository = {
  async listAll() {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT f.ID, f.CONFERENCE_ID, f.FLOOR_NUMBER, c.NAME as CONFERENCE_NAME 
         FROM FLOORS f 
         JOIN CONFERENCES c ON f.CONFERENCE_ID = c.ID 
         ORDER BY c.NAME, f.FLOOR_NUMBER`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async list(conferenceId: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `SELECT ID, CONFERENCE_ID, FLOOR_NUMBER FROM FLOORS WHERE CONFERENCE_ID = :conf ORDER BY FLOOR_NUMBER`,
        { conf: conferenceId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(conferenceId: number, floorNumber: number) {
    return withConn(async conn => {
      const res = await conn.execute(
        `INSERT INTO FLOORS (CONFERENCE_ID, FLOOR_NUMBER) VALUES (:conf, :num) RETURNING ID INTO :id`,
        {
          conf: conferenceId,
          num: floorNumber,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      return (res.outBinds as { id: number[] }).id[0];
    });
  },
  async remove(id: number) {
    return withConn(async conn => {
      await conn.execute(`DELETE FROM FLOORS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },
};
