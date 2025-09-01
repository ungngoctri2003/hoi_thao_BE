import { withConn } from '../../config/db';

export const permissionsRepository = {
  async list() {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME, CATEGORY, DESCRIPTION FROM PERMISSIONS ORDER BY ID`,
        {},
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async create(code: string, name: string, category?: string, description?: string) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO PERMISSIONS (CODE, NAME, CATEGORY, DESCRIPTION)
         VALUES (:code, :name, :category, :description) RETURNING ID INTO :ID`,
        { code, name, category: category || null, description: description || null, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      return (res.outBinds as any).ID[0];
    });
  }
};





