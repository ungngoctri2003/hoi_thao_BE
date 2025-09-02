import { withConn } from '../../config/db'
import oracledb from 'oracledb';

export const permissionsRepository = {
  async list() {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME, CATEGORY, DESCRIPTION FROM PERMISSIONS ORDER BY ID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(code: string, name: string, category?: string, description?: string) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO PERMISSIONS (CODE, NAME, CATEGORY, DESCRIPTION)
         VALUES (:code, :name, :category, :description) RETURNING ID INTO :ID`,
        { code, name, category: category || null, description: description || null, ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as { ID: number[] }).ID[0];
    });
  }
};






