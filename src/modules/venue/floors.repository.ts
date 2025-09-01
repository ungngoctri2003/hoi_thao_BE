import { withConn } from '../../config/db';

export const floorsRepository = {
  async list(conferenceId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CONFERENCE_ID, FLOOR_NUMBER FROM FLOORS WHERE CONFERENCE_ID = :conf ORDER BY FLOOR_NUMBER`,
        { conf: conferenceId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(conferenceId: number, floorNumber: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO FLOORS (CONFERENCE_ID, FLOOR_NUMBER) VALUES (:conf, :num) RETURNING ID INTO :ID`,
        { conf: conferenceId, num: floorNumber, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as any).ID[0];
    });
  },
  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM FLOORS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  }
};





