import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export type AuditLogRow = {
  ID: number;
  TS: Date;
  USER_ID: number | null;
  ACTION_NAME: string | null;
  RESOURCE_NAME: string | null;
  DETAILS: string | null;
  IP_ADDRESS: string | null;
  USER_AGENT: string | null;
  STATUS: string | null;
  CATEGORY: string | null;
};

export const auditRepository = {
  async insert(entry: Omit<AuditLogRow, 'ID' | 'TS'>) {
    return withConn(async (conn) => {
      await conn.execute(
        `INSERT INTO AUDIT_LOGS (USER_ID, ACTION_NAME, RESOURCE_NAME, DETAILS, IP_ADDRESS, USER_AGENT, STATUS, CATEGORY)
         VALUES (:USER_ID, :ACTION_NAME, :RESOURCE_NAME, :DETAILS, :IP_ADDRESS, :USER_AGENT, :STATUS, :CATEGORY)`,
        entry,
        { autoCommit: true }
      );
    });
  },
  async getById(id: number) {
    return withConn(async (conn) => {
      const res = await conn.execute(
        `SELECT ID, TS, USER_ID, ACTION_NAME, RESOURCE_NAME, DETAILS, IP_ADDRESS, USER_AGENT, STATUS, CATEGORY FROM AUDIT_LOGS WHERE ID = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (res.rows as any[]) || [];
      return rows[0] || null;
    });
  },

  async list(params: { userId?: number; category?: string; status?: string; q?: string; from?: string; to?: string; page: number; limit: number; }) {
    const { page, limit } = params;
    const offset = (page - 1) * limit;
    return withConn(async (conn) => {
      const binds: any = {};
      let where = '1=1';
      if (params.userId) { where += ' AND USER_ID = :userId'; binds.userId = params.userId; }
      if (params.category) { where += ' AND CATEGORY = :category'; binds.category = params.category; }
      if (params.status) { where += ' AND STATUS = :status'; binds.status = params.status; }
      if (params.q) { where += ' AND (ACTION_NAME LIKE :q OR RESOURCE_NAME LIKE :q OR DETAILS LIKE :q)'; binds.q = `%${params.q}%`; }
      if (params.from) { where += ' AND TS >= TO_TIMESTAMP(:from, \"YYYY-MM-DD\"T\"HH24:MI:SS.FF3\"Z\")'; binds.from = params.from; }
      if (params.to) { where += ' AND TS <= TO_TIMESTAMP(:to, \"YYYY-MM-DD\"T\"HH24:MI:SS.FF3\"Z\")'; binds.to = params.to; }

      const listRes = await conn.execute(
        `SELECT * FROM (
           SELECT t.*, ROWNUM rn FROM (
             SELECT ID, TS, USER_ID, ACTION_NAME, RESOURCE_NAME, DETAILS, IP_ADDRESS, USER_AGENT, STATUS, CATEGORY
             FROM AUDIT_LOGS WHERE ${where} ORDER BY TS DESC
           ) t WHERE ROWNUM <= :maxRow
         ) WHERE rn > :minRow`,
        { ...binds, maxRow: offset + limit, minRow: offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM AUDIT_LOGS WHERE ${where}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (listRes.rows as any[]) || [];
      const total = Number((countRes.rows as Array<{CNT: number}>)[0]?.CNT || 0);
      return { rows: rows as AuditLogRow[], total };
    });
  }
};


