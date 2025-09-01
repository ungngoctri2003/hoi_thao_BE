import { withConn } from '../../config/db';

type UserRow = {
  ID: number;
  EMAIL: string;
  NAME: string;
  PASSWORD_HASH: string | null;
};

export const usersRepository = {
  async list(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, EMAIL, NAME, STATUS, CREATED_AT, LAST_LOGIN FROM APP_USERS ORDER BY CREATED_AT DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { maxRow: offset + limit, minRow: offset },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM APP_USERS`,
        {},
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number(((countRes.rows as any[])[0] as any).CNT);
      return { rows, total };
    });
  },

  async findById(id: number): Promise<UserRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, PASSWORD_HASH FROM APP_USERS WHERE ID = :id`,
        { id },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },
  async findByEmail(email: string): Promise<UserRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, PASSWORD_HASH FROM APP_USERS WHERE EMAIL = :email`,
        { email },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },

  async create(data: { EMAIL: string; NAME: string; PASSWORD_HASH: string | null; }): Promise<UserRow> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `INSERT INTO APP_USERS (EMAIL, NAME, PASSWORD_HASH) VALUES (:EMAIL, :NAME, :PASSWORD_HASH) RETURNING ID INTO :ID`,
        { ...data, ID: { dir: (require('oracledb') as any).BIND_OUT, type: (require('oracledb') as any).NUMBER } },
        { autoCommit: true }
      );
      const id = (res.outBinds as any).ID[0];
      return { ID: id, EMAIL: data.EMAIL, NAME: data.NAME, PASSWORD_HASH: data.PASSWORD_HASH };
    });
  },

  async getPermissions(userId: number): Promise<string[]> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT p.CODE as CODE
         FROM USER_ROLES ur
         JOIN ROLES r ON r.ID = ur.ROLE_ID
         JOIN ROLE_PERMISSIONS rp ON rp.ROLE_ID = r.ID
         JOIN PERMISSIONS p ON p.ID = rp.PERMISSION_ID
         WHERE ur.USER_ID = :userId`,
        { userId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows.map(r => r.CODE as string);
    });
  },
  async updateLastLogin(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`UPDATE APP_USERS SET LAST_LOGIN = SYSTIMESTAMP WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },

  async update(id: number, data: Partial<{ EMAIL: string; NAME: string; PASSWORD_HASH: string | null; STATUS: string }>) {
    return withConn(async (conn) => {
      const fields: string[] = []; const binds: any = { id };
      for (const key of Object.keys(data)) { fields.push(`${key} = :${key}`); binds[key] = (data as any)[key]; }
      if (fields.length === 0) return this.findById(id);
      await conn.execute(`UPDATE APP_USERS SET ${fields.join(', ')} WHERE ID = :id`, binds, { autoCommit: true });
      return this.findById(id);
    });
  },

  async remove(id: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM APP_USERS WHERE ID = :id`, { id }, { autoCommit: true });
    });
  },

  async assignRole(userId: number, roleId: number) {
    return withConn(async (conn) => {
      await conn.execute(
        `INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (:userId, :roleId)`,
        { userId, roleId },
        { autoCommit: true }
      );
    });
  },

  async removeRole(userId: number, roleId: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM USER_ROLES WHERE USER_ID = :userId AND ROLE_ID = :roleId`, { userId, roleId }, { autoCommit: true });
    });
  },

  async listRoles(userId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT r.ID, r.CODE, r.NAME FROM USER_ROLES ur JOIN ROLES r ON r.ID = ur.ROLE_ID WHERE ur.USER_ID = :userId`,
        { userId },
        { outFormat: (require('oracledb') as any).OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async setPassword(id: number, passwordHash: string) {
    return withConn(async (conn) => {
      await conn.execute(`UPDATE APP_USERS SET PASSWORD_HASH = :hash WHERE ID = :id`, { hash: passwordHash, id }, { autoCommit: true });
    });
  }
};


