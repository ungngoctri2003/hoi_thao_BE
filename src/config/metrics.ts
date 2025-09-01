import express from 'express';
import client from 'prom-client';

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status', 'endpoint']
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'status', 'endpoint']
});

export const activeConnections = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

export function registerMetrics() {
  client.collectDefaultMetrics();
  
  // Add custom metrics
  client.register.registerMetric(httpRequestCounter);
  client.register.registerMetric(httpRequestDuration);
  client.register.registerMetric(activeConnections);
}

export const metricsRouter = express.Router();

metricsRouter.get('/', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});



