import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { logger } from '../app';

let ioInstance: Server | null = null;
let messagesNs: ReturnType<Server['of']> | null = null;
let analyticsNs: ReturnType<Server['of']> | null = null;

export function initSocket(server: HttpServer) {
  if (ioInstance) return ioInstance;
  
  try {
    const io = new Server(server, {
      path: '/ws',
      cors: { 
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    messagesNs = io.of('/ws/messages');
    analyticsNs = io.of('/ws/analytics');

    // Handle connection errors
    io.on('connect_error', (error) => {
      logger.error({ error }, 'Socket connection error');
    });

    messagesNs.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'User connected to messages namespace');
      
      socket.on('join', (room: string) => {
        socket.join(room);
        logger.info({ socketId: socket.id, room }, 'User joined room');
      });
      
      socket.on('leave', (room: string) => {
        socket.leave(room);
        logger.info({ socketId: socket.id, room }, 'User left room');
      });
      
      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'User disconnected from messages namespace');
      });
    });

    analyticsNs.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'User connected to analytics namespace');
      
      socket.on('join', (room: string) => {
        socket.join(room);
        logger.info({ socketId: socket.id, room }, 'User joined analytics room');
      });
      
      socket.on('leave', (room: string) => {
        socket.leave(room);
        logger.info({ socketId: socket.id, room }, 'User left analytics room');
      });
      
      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'User disconnected from analytics namespace');
      });
    });

    ioInstance = io;
    return ioInstance;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Socket.IO');
    throw error;
  }
}

export function emitSessionMessage(sessionId: number, payload: unknown) {
  messagesNs?.to(`session:${sessionId}`).emit('message', payload);
}

export function emitAnalytics(room: string, event: string, payload: unknown) {
  analyticsNs?.to(room).emit(event, payload);
}


