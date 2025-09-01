import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

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
      console.error('Socket connection error:', error);
    });

    messagesNs.on('connection', (socket) => {
      console.log(`User connected to messages namespace: ${socket.id}`);
      
      socket.on('join', (room: string) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
      });
      
      socket.on('leave', (room: string) => {
        socket.leave(room);
        console.log(`User ${socket.id} left room: ${room}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`User disconnected from messages namespace: ${socket.id}`);
      });
    });

    analyticsNs.on('connection', (socket) => {
      console.log(`User connected to analytics namespace: ${socket.id}`);
      
      socket.on('join', (room: string) => {
        socket.join(room);
        console.log(`User ${socket.id} joined analytics room: ${room}`);
      });
      
      socket.on('leave', (room: string) => {
        socket.leave(room);
        console.log(`User ${socket.id} left analytics room: ${room}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`User disconnected from analytics namespace: ${socket.id}`);
      });
    });

    ioInstance = io;
    return ioInstance;
  } catch (error) {
    console.error('Failed to initialize Socket.IO:', error);
    throw error;
  }
}

export function emitSessionMessage(sessionId: number, payload: any) {
  messagesNs?.to(`session:${sessionId}`).emit('message', payload);
}

export function emitAnalytics(room: string, event: string, payload: any) {
  analyticsNs?.to(room).emit(event, payload);
}


