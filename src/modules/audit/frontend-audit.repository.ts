import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export const frontendAuditRepository = {
  async create(entry: { userId?: number; action: string; page: string; details?: string; timestamp?: string; ipAddress?: string; userAgent?: string }) {
    return withConn(async (conn) => {
      // Use existing AUDIT_LOGS table with frontend-specific category
      const details = JSON.stringify({
        page: entry.page,
        details: entry.details,
        type: 'frontend'
      });

      await conn.execute(
        `INSERT INTO AUDIT_LOGS (USER_ID, ACTION_NAME, RESOURCE_NAME, DETAILS, IP_ADDRESS, USER_AGENT, STATUS, CATEGORY)
         VALUES (:USER_ID, :ACTION_NAME, :RESOURCE_NAME, :DETAILS, :IP_ADDRESS, :USER_AGENT, :STATUS, :CATEGORY)`,
        {
          USER_ID: entry.userId || null,
          ACTION_NAME: entry.action,
          RESOURCE_NAME: 'frontend',
          DETAILS: details,
          IP_ADDRESS: entry.ipAddress || null,
          USER_AGENT: entry.userAgent || null,
          STATUS: 'success',
          CATEGORY: 'system'
        },
        { autoCommit: true }
      );
    });
  }
};
