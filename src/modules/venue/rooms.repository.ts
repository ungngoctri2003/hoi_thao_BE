import { withConn } from '../../config/db';

export const roomsRepository = {
  async list(floorId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, FLOOR_ID, NAME, CAPACITY FROM ROOMS WHERE FLOOR_ID = :floor ORDER BY NAME`,
        { floor: floorId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(floorId: number, name: string, capacity?: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO ROOMS (FLOOR_ID, NAME, CAPACITY) VALUES (:floor, :name, :cap) RETURNING ID INTO :ID`,
        { floor: floorId, name, cap: capacity || null, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as any).ID[0];
    });
  },
  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM ROOMS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  }
};





