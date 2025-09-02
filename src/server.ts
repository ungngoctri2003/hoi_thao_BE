import http from 'http';
import dotenv from 'dotenv';
import app, { logger } from './app';
import { initSocket } from './sockets';
import { initPool, withConn } from './config/db';
import oracledb from 'oracledb';

dotenv.config();

const port = Number(process.env.PORT || 4000);

// Database connection check function
async function checkDatabaseConnection() {
  try {
    logger.info('🔍 Checking database connection...');
    
    // Initialize database pool
    const pool = await initPool();
    if (!pool) {
      logger.error('❌ Failed to initialize database pool');
      return false;
    }
    
    // Test basic connection
    const startTime = Date.now();
    const result = await withConn(async (conn) => {
      const query = await conn.execute(
        'SELECT 1 as test, SYSTIMESTAMP as server_time FROM DUAL', 
        {}, 
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return query.rows?.[0] || null;
    });
    
    const responseTime = Date.now() - startTime;
    
    if (result) {
      logger.info({
        responseTime: `${responseTime}ms`,
        serverTime: result.SERVER_TIME
      }, '✅ Database connection successful');
      return true;
    } else {
      logger.error('❌ Database connection test failed - no result returned');
      return false;
    }
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, '❌ Database connection failed');
    return false;
  }
}

// Database schema validation function
async function validateDatabaseSchema() {
  try {
    logger.info('🔍 Validating database schema...');
    
    const result = await withConn(async (conn) => {
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
        existingTables: existingTables.length,
        missingTables: missingTables,
        isComplete: missingTables.length === 0
      };
    });
    
    if (result.isComplete) {
      logger.info({
        existingTables: result.existingTables,
        totalRequired: 15
      }, 'Database schema is complete');
      return true;
    } else {
      logger.warn({
        existingTables: result.existingTables,
        missingTables: result.missingTables,
        totalRequired: 15
      }, ' Database schema is incomplete');
      return false;
    }
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'Database schema validation failed');
    return false;
  }
}

// Test database operations
async function testDatabaseOperations() {
  try {
    logger.info('🔍 Testing database operations...');
    
    const result = await withConn(async (conn) => {
      // Test INSERT with RETURNING ID
      const insertResult = await conn.execute(
        `INSERT INTO ROLES (CODE, NAME) VALUES ('TEST_ROLE_${Date.now()}', 'Test Role for Startup Check') 
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
        insertSuccess: true,
        selectSuccess: true,
        deleteSuccess: true,
        testId: insertedId
      };
    });
    
    logger.info({
      testId: result.testId
    }, '✅ Database operations test successful');
    return true;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, '❌ Database operations test failed');
    return false;
  }
}

// Startup database checks
async function performStartupChecks() {
  logger.info('🚀 Starting database health checks...');
  
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    logger.error('💥 Database connection failed. Server will start but may not work properly.');
    return false;
  }
  
  const schemaOk = await validateDatabaseSchema();
  if (!schemaOk) {
    logger.warn('⚠️  Database schema is incomplete. Some features may not work.');
  }
  
  const operationsOk = await testDatabaseOperations();
  if (!operationsOk) {
    logger.warn('⚠️  Database operations test failed. Some features may not work.');
  }
  
  if (connectionOk && schemaOk && operationsOk) {
    logger.info('🎉 All database checks passed! System is ready.');
    return true;
  } else {
    logger.warn('⚠️  Some database checks failed. Please review the logs above.');
    return false;
  }
}

const server = http.createServer(app);

// Initialize WebSocket
try {
  initSocket(server);
  logger.info('WebSocket initialized successfully');
} catch (error) {
  logger.error({ error: error as Error }, 'Failed to initialize WebSocket');
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server with database checks
async function startServer() {
  try {
    // Perform database checks first
    const dbChecksPassed = await performStartupChecks();
    
    // Start the server regardless of database status
    server.listen(port, () => {
      logger.info({ 
        port, 
        databaseStatus: dbChecksPassed ? 'ready' : 'issues_detected' 
      }, 'Server started successfully');
      
      if (dbChecksPassed) {
        logger.info('Conference Management System is ready to use!');
      } else {
        logger.warn(' Server started but database has issues. Please check the logs above.');
      }
    });
  } catch (error) {
    logger.error({ error: error as Error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

server.on('error', (error: Error) => {
  logger.error({ error }, 'Server error');
  process.exit(1);
});



