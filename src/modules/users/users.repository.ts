import { withConn } from '../../config/db';
import oracledb from 'oracledb';

type UserRow = {
  ID: number;
  EMAIL: string;
  NAME: string;
  PASSWORD_HASH: string | null;
  STATUS?: string | null;
  FIREBASE_UID?: string | null;
  AVATAR_URL?: string | null;
  ROLE_CODE?: string | null;
};

export const usersRepository = {
  async list(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT u.ID, u.EMAIL, u.NAME, u.STATUS, u.CREATED_AT, u.LAST_LOGIN, u.AVATAR_URL, 
                    (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID AND ROWNUM = 1) as ROLE_CODE
             FROM APP_USERS u
             ORDER BY u.CREATED_AT DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM APP_USERS`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows, total };
    });
  },

  async findById(id: number): Promise<UserRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT u.ID, u.EMAIL, u.NAME, u.PASSWORD_HASH, u.STATUS, u.FIREBASE_UID, u.AVATAR_URL, 
                (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID AND ROWNUM = 1) as ROLE_CODE
         FROM APP_USERS u
         WHERE u.ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },

  async getUserRole(userId: number): Promise<{ role_code: string } | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT r.CODE as role_code 
         FROM USER_ROLES ur 
         JOIN ROLES r ON ur.ROLE_ID = r.ID 
         WHERE ur.USER_ID = :userId AND ROWNUM = 1`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as { role_code: string }) || null;
    });
  },
  async findByEmail(email: string): Promise<UserRow | null> {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, PASSWORD_HASH, STATUS, FIREBASE_UID, AVATAR_URL FROM APP_USERS WHERE EMAIL = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return (rows[0] as UserRow) || null;
    });
  },

  async create(data: { EMAIL: string; NAME: string; PASSWORD_HASH: string | null; FIREBASE_UID?: string | null; AVATAR_URL?: string | null; }): Promise<UserRow> {
    return withConn(async (conn) => {
      // Build dynamic query based on available data
      const fields = ['EMAIL', 'NAME'];
      const values = [':EMAIL', ':NAME'];
      const bindParams: any = {
        EMAIL: data.EMAIL,
        NAME: data.NAME,
        ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };
      
      // Add optional fields only if they have values
      if (data.PASSWORD_HASH !== null && data.PASSWORD_HASH !== undefined) {
        fields.push('PASSWORD_HASH');
        values.push(':PASSWORD_HASH');
        bindParams.PASSWORD_HASH = data.PASSWORD_HASH;
      }
      
      if (data.FIREBASE_UID !== null && data.FIREBASE_UID !== undefined) {
        fields.push('FIREBASE_UID');
        values.push(':FIREBASE_UID');
        bindParams.FIREBASE_UID = data.FIREBASE_UID;
      }
      
      if (data.AVATAR_URL !== null && data.AVATAR_URL !== undefined) {
        fields.push('AVATAR_URL');
        values.push(':AVATAR_URL');
        bindParams.AVATAR_URL = data.AVATAR_URL;
      }
      
      const query = `INSERT INTO APP_USERS (${fields.join(', ')}) VALUES (${values.join(', ')}) RETURNING ID INTO :ID`;
      
      console.log('Creating user with query:', query);
      console.log('Bind params:', bindParams);
      
      const res = await conn.execute(query, bindParams, { autoCommit: true });
      
      const id = (res.outBinds as { ID: number[] }).ID[0];
      if (!id) throw new Error('Failed to get created ID');
      
      return { 
        ID: id, 
        EMAIL: data.EMAIL, 
        NAME: data.NAME, 
        PASSWORD_HASH: data.PASSWORD_HASH, 
        FIREBASE_UID: data.FIREBASE_UID || null, 
        AVATAR_URL: data.AVATAR_URL || null 
      };
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
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
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

  async update(id: number, data: Partial<{ EMAIL: string; NAME: string; PASSWORD_HASH: string | null; STATUS: string; AVATAR_URL: string; FIREBASE_UID: string }>) {
    return withConn(async (conn) => {
      const fields: string[] = []; const binds: any = { id };
      for (const key of Object.keys(data)) { fields.push(`${key} = :${key}`); binds[key] = (data as Record<string, any>)[key]; }
      if (fields.length === 0) return usersRepository.findById(id);
      await conn.execute(`UPDATE APP_USERS SET ${fields.join(', ')} WHERE ID = :id`, binds, { autoCommit: true });
      return usersRepository.findById(id);
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

  async removeAllRoles(userId: number) {
    return withConn(async (conn) => {
      await conn.execute(`DELETE FROM USER_ROLES WHERE USER_ID = :userId`, { userId }, { autoCommit: true });
    });
  },

  async listRoles(userId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT r.ID, r.CODE, r.NAME FROM USER_ROLES ur JOIN ROLES r ON r.ID = ur.ROLE_ID WHERE ur.USER_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },
  async setPassword(id: number, passwordHash: string) {
    return withConn(async (conn) => {
      await conn.execute(`UPDATE APP_USERS SET PASSWORD_HASH = :hash WHERE ID = :id`, { hash: passwordHash, id }, { autoCommit: true });
    });
  },

  async findRoleByCode(roleCode: string) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, CODE, NAME FROM ROLES WHERE CODE = :code`,
        { code: roleCode },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows[0] || null;
    });
  },

  async getUsersByRole(roleId: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT u.ID, u.EMAIL, u.NAME, u.STATUS, u.AVATAR_URL 
         FROM APP_USERS u 
         JOIN USER_ROLES ur ON u.ID = ur.USER_ID 
         WHERE ur.ROLE_ID = :roleId`,
        { roleId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async findAll() {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, EMAIL, NAME, STATUS, AVATAR_URL FROM APP_USERS ORDER BY ID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (res.rows as any[]) || [];
    });
  },

  async listAllUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      // Union APP_USERS and ATTENDEES to get all users
      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT 
               u.ID, 
               u.EMAIL, 
               u.NAME, 
               u.STATUS, 
               u.CREATED_AT, 
               u.LAST_LOGIN, 
               u.AVATAR_URL,
               'app_user' as USER_TYPE,
               (SELECT r.CODE FROM USER_ROLES ur2 JOIN ROLES r ON ur2.ROLE_ID = r.ID WHERE ur2.USER_ID = u.ID AND ROWNUM = 1) as ROLE_CODE
             FROM APP_USERS u
             UNION ALL
             SELECT 
               a.ID + 10000 as ID,  -- Offset to avoid ID conflicts
               a.EMAIL, 
               a.NAME, 
               'active' as STATUS,
               a.CREATED_AT,
               NULL as LAST_LOGIN,
               a.AVATAR_URL,
               'attendee' as USER_TYPE,
               'attendee' as ROLE_CODE
             FROM ATTENDEES a
             ORDER BY NAME
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM (
           SELECT ID FROM APP_USERS
           UNION ALL
           SELECT ID + 10000 FROM ATTENDEES
         )`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows, total };
    });
  }
};


