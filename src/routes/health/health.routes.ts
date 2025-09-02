import { Router } from 'express';
import { withConn } from '../../config/db';
import oracledb from 'oracledb';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', (_req, res) => {
  res.json({ 
    data: { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'conference-management-api'
    } 
  });
});

// Database connection test
healthRouter.get('/db', async (_req, res) => {
  try {
    const startTime = Date.now();
    
    const result = await withConn(async (conn) => {
      // Test basic connection
      const basicQuery = await conn.execute(
        'SELECT 1 as test, SYSTIMESTAMP as server_time FROM DUAL', 
        {}, 
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      // Test if we can access system tables
      const systemQuery = await conn.execute(
        'SELECT COUNT(*) as table_count FROM user_tables', 
        {}, 
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return {
        basic_test: basicQuery.rows?.[0] || null,
        system_access: systemQuery.rows?.[0] || null
      };
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({ 
      data: { 
        status: 'ok', 
        database: 'connected',
        response_time_ms: responseTime,
        tests: result
      } 
    });
  } catch (error) {
    res.status(503).json({ 
      error: { 
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } 
    });
  }
});

// Database schema validation
healthRouter.get('/db/schema', async (_req, res) => {
  try {
    const result = await withConn(async (conn) => {
      // Check if all required tables exist
      const tablesQuery = await conn.execute(
        `SELECT table_name, 
                CASE WHEN table_name IN (
                  'ATTENDEES', 'APP_USERS', 'CONFERENCES', 'SESSIONS', 
                  'REGISTRATIONS', 'CHECKINS', 'MESSAGES', 'MATCHES', 
                  'ROLES', 'PERMISSIONS', 'USER_ROLES', 'ROLE_PERMISSIONS', 
                  'AUDIT_LOGS', 'FLOORS', 'ROOMS'
                ) THEN 'required' ELSE 'optional' END as table_type
         FROM user_tables 
         WHERE table_name IN (
           'ATTENDEES', 'APP_USERS', 'CONFERENCES', 'SESSIONS', 
           'REGISTRATIONS', 'CHECKINS', 'MESSAGES', 'MATCHES', 
           'ROLES', 'PERMISSIONS', 'USER_ROLES', 'ROLE_PERMISSIONS', 
           'AUDIT_LOGS', 'FLOORS', 'ROOMS'
         )
         ORDER BY table_name`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      const existingTables = (tablesQuery.rows as any[]) || [];
      const requiredTables = [
        'ATTENDEES', 'APP_USERS', 'CONFERENCES', 'SESSIONS', 
        'REGISTRATIONS', 'CHECKINS', 'MESSAGES', 'MATCHES', 
        'ROLES', 'PERMISSIONS', 'USER_ROLES', 'ROLE_PERMISSIONS', 
        'AUDIT_LOGS', 'FLOORS', 'ROOMS'
      ];
      
      const existingTableNames = existingTables.map(t => t.TABLE_NAME);
      const missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
      
      return {
        existing_tables: existingTables,
        missing_tables: missingTables,
        schema_status: missingTables.length === 0 ? 'complete' : 'incomplete'
      };
    });
    
    const status = result.missing_tables.length === 0 ? 200 : 503;
    
    res.status(status).json({ 
      data: { 
        status: result.missing_tables.length === 0 ? 'ok' : 'warning',
        schema_validation: result,
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    res.status(503).json({ 
      error: { 
        code: 'SCHEMA_VALIDATION_ERROR',
        message: 'Failed to validate database schema',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } 
    });
  }
});

// Test database operations (create/read/delete)
healthRouter.get('/db/operations', async (_req, res) => {
  try {
    const result = await withConn(async (conn) => {
      // Test INSERT with RETURNING ID
      const insertResult = await conn.execute(
        `INSERT INTO ROLES (CODE, NAME) VALUES ('TEST_ROLE_${Date.now()}', 'Test Role for Health Check') 
         RETURNING ID INTO :ID`,
        { ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      
      const insertedId = (insertResult.outBinds as { ID: number[] }).ID[0];
      
      // Test SELECT
      const selectResult = await conn.execute(
        'SELECT ID, CODE, NAME FROM ROLES WHERE ID = :id',
        { id: insertedId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      // Test DELETE
      await conn.execute(
        'DELETE FROM ROLES WHERE ID = :id',
        { id: insertedId },
        { autoCommit: true }
      );
      
      return {
        insert_test: { success: true, id: insertedId },
        select_test: { success: true, data: selectResult.rows?.[0] || null },
        delete_test: { success: true }
      };
    });
    
    res.json({ 
      data: { 
        status: 'ok', 
        database_operations: 'working',
        tests: result,
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    res.status(503).json({ 
      error: { 
        code: 'DATABASE_OPERATIONS_ERROR',
        message: 'Database operations test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } 
    });
  }
});
