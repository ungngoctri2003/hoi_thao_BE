import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
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
const max = Number(process.env.RATE_LIMIT_MAX || 100);
app.use(rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }));

app.use(metricsMiddleware());

app.get('/healthz', (_req, res) => res.json({ data: { status: 'ok' } }));
app.use('/metrics', metricsRouter);
setupSwagger(app);

app.use('/api/v1', v1);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

app.use(errorHandler);

registerMetrics();

export default app;


