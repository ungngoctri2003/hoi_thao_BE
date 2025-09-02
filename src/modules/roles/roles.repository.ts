import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export const rolesRepository = {
  async list() {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME FROM ROLES ORDER BY ID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(code: string, name: string) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO ROLES (CODE, NAME) VALUES (:code, :name) RETURNING ID INTO :ID`,
        { code, name, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as { ID: number[] }).ID[0];
    });
  },
  async assignPermission(roleId: number, permId: number) {
    return withConn(async (conn) => {
      await conn.execute(`INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (:roleId, :permId)`, { roleId, permId }, { autoCommit: true });
    });
  },
  async removePermission(roleId: number, permId: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM ROLE_PERMISSIONS WHERE ROLE_ID = :roleId AND PERMISSION_ID = :permId`, { roleId, permId }, { autoCommit: true });
    });
  }
};


