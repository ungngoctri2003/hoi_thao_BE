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
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Use default namespace for main connections
    messagesNs = io;
    analyticsNs = io.of('/analytics');

    // Handle connection errors
    io.on('connect_error', (error) => {
      logger.error({ error }, 'Socket connection error');
    });

    messagesNs.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'User connected to main namespace');
      
      socket.on('join', (room: string) => {
        socket.join(room);
        logger.info({ socketId: socket.id, room }, 'User joined room');
      });
      
      socket.on('leave', (room: string) => {
        socket.leave(room);
        logger.info({ socketId: socket.id, room }, 'User left room');
      });
      
      socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'User disconnected from main namespace');
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

export function emitUserPermissionChange(userId: number, payload: {
  type: 'role_changed' | 'permission_changed';
  oldRole?: string;
  newRole?: string;
  permissions?: any[];
  timestamp: string;
}) {
  // Emit to user-specific room
  messagesNs?.to(`user:${userId}`).emit('permission_change', payload);
  
  // Also emit to analytics namespace for tracking
  analyticsNs?.to(`user:${userId}`).emit('permission_change', payload);
  
  logger.info({ userId, payload }, 'Emitted permission change notification');
}

export function emitUserNotification(userId: number | string, payload: {
  type: 'system_notification';
  title: string;
  message: string;
  notificationType: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  notificationId?: number;
  category?: string;
  data?: any;
}) {
  if (userId === 'all') {
    // Emit to all connected users
    messagesNs?.emit('system_notification', payload);
    analyticsNs?.emit('system_notification', payload);
    logger.info({ payload }, 'Emitted broadcast system notification');
  } else {
    // Emit to specific user
    messagesNs?.to(`user:${userId}`).emit('system_notification', payload);
    analyticsNs?.to(`user:${userId}`).emit('system_notification', payload);
    logger.info({ userId, payload }, 'Emitted user-specific system notification');
  }
}

// Enhanced notification functions
export function emitNotificationUpdate(userId: number, payload: {
  type: 'notification_update';
  action: 'created' | 'read' | 'archived' | 'deleted';
  notificationId: number;
  timestamp: string;
}) {
  messagesNs?.to(`user:${userId}`).emit('notification_update', payload);
  analyticsNs?.to(`user:${userId}`).emit('notification_update', payload);
  logger.info({ userId, payload }, 'Emitted notification update');
}

export function emitNotificationStats(userId: number, stats: {
  total_notifications: number;
  unread_count: number;
  active_count: number;
}) {
  messagesNs?.to(`user:${userId}`).emit('notification_stats', stats);
  analyticsNs?.to(`user:${userId}`).emit('notification_stats', stats);
  logger.info({ userId, stats }, 'Emitted notification stats');
}

export function emitBulkNotificationUpdate(userIds: number[], payload: {
  type: 'bulk_notification_update';
  action: 'created' | 'broadcast';
  count: number;
  timestamp: string;
}) {
  userIds.forEach(userId => {
    messagesNs?.to(`user:${userId}`).emit('bulk_notification_update', payload);
    analyticsNs?.to(`user:${userId}`).emit('bulk_notification_update', payload);
  });
  logger.info({ userIds: userIds.length, payload }, 'Emitted bulk notification update');
}


