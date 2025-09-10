import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
import oracledb from 'oracledb';
import { metricsRouter, registerMetrics } from './config/metrics';
import { errorHandler } from './middlewares/error';
import { corsOptions } from './middlewares/cors';
import { metricsMiddleware } from './middlewares/metrics';
import { router as v1 } from './routes';
import { setupSwagger } from './config/swagger';

dotenv.config();

export const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors(corsOptions));

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const max = Number(process.env.RATE_LIMIT_MAX || 300); // Increased from 100 to 300 requests per minute
app.use(
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      },
    },
    skip: req => {
      // Skip rate limiting for health checks
      return req.path === '/healthz' || req.path === '/healthz/db';
    },
  })
);

app.use(metricsMiddleware());

app.get('/healthz', (_req, res) => res.json({ data: { status: 'ok' } }));

// Database health check endpoint
app.get('/healthz/db', async (_req, res) => {
  try {
    const { withConn } = await import('./config/db');
    const result = await withConn(async conn => {
      const query = await conn.execute(
        'SELECT 1 as test FROM DUAL',
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return query.rows?.[0] || null;
    });

    res.json({
      data: {
        status: 'ok',
        database: 'connected',
        test_query: result,
      },
    });
  } catch (error) {
    res.status(503).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});
app.use('/metrics', metricsRouter);
setupSwagger(app);

app.use('/api/v1', v1);

// Test database connection endpoint (no auth required)
app.get('/test-db', async (req, res) => {
  try {
    const { usersRepository } = await import('./modules/users/users.repository');
    const result = await usersRepository.testConnection();
    res.json({ status: 'OK', message: 'Database connection successful', result });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Messaging endpoints (no auth required for testing)
app.get('/messaging/users-with-messages', async (req, res) => {
  try {
    const { usersRepository } = await import('./modules/users/users.repository');
    const users = await usersRepository.getUsersWithMessages();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Messaging test failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/messaging/available-users', async (req, res) => {
  try {
    const { usersRepository } = await import('./modules/users/users.repository');
    const users = await usersRepository.getAvailableUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Available users test failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/messaging/users-by-category', async (req, res) => {
  try {
    const { conferenceId } = req.query;
    const { usersRepository } = await import('./modules/users/users.repository');
    const users = await usersRepository.getUsersByConferenceCategory(
      conferenceId ? Number(conferenceId) : undefined
    );
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Users by category test failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/messaging/conference-users-with-details', async (req, res) => {
  try {
    const { conferenceId } = req.query;
    const { usersRepository } = await import('./modules/users/users.repository');
    const users = await usersRepository.getConferenceUsersWithDetails(
      conferenceId ? Number(conferenceId) : undefined
    );
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Conference users with details test failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/messaging/add-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'userId is required',
      });
      return;
    }

    const { usersRepository } = await import('./modules/users/users.repository');
    const result = await (usersRepository as any).addUserToMessaging(Number(userId));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Add user to messaging failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

app.use(errorHandler);

registerMetrics();

export default app;
