import http from 'http';
import dotenv from 'dotenv';
import app, { logger } from './app';
import { initSocket } from './sockets';

dotenv.config();

const port = Number(process.env.PORT || 4000);

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

server.listen(port, () => {
  logger.info({ port }, 'Server started successfully');
});

server.on('error', (error: Error) => {
  logger.error({ error }, 'Server error');
  process.exit(1);
});



