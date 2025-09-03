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
  async findById(id: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME FROM ROLES WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows[0] || null;
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
  },
  async getPermissions(roleId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT p.ID, p.NAME, p.DESCRIPTION, p.CATEGORY 
         FROM PERMISSIONS p 
         INNER JOIN ROLE_PERMISSIONS rp ON p.ID = rp.PERMISSION_ID 
         WHERE rp.ROLE_ID = :roleId 
         ORDER BY p.ID`,
        { roleId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async update(roleId: number, code: string, name: string) {
    return withConn(async (conn) => {
      await conn.execute(
        `UPDATE ROLES SET CODE = :code, NAME = :name WHERE ID = :roleId`,
        { roleId, code, name },
        { autoCommit: true }
      );
    });
  },
  async delete(roleId: number) {
    return withConn(async (conn) => {
      // First remove all role permissions
      await conn.execute(
        `DELETE FROM ROLE_PERMISSIONS WHERE ROLE_ID = :roleId`,
        { roleId },
        { autoCommit: false }
      );
      // Then delete the role
      await conn.execute(
        `DELETE FROM ROLES WHERE ID = :roleId`,
        { roleId },
        { autoCommit: true }
      );
    });
  }
};


