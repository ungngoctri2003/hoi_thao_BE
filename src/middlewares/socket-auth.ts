import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../app';
import { verifyToken } from '../utils/crypto';

export interface AuthenticatedSocket extends Socket {
  userId?: number;
  user?: any;
}

export function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token =
    socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

  try {
    logger.info(
      {
        socketId: socket.id,
        hasAuthToken: !!socket.handshake.auth?.token,
        hasAuthHeader: !!socket.handshake.headers?.authorization,
        tokenLength: token?.length || 0,
        tokenStart: token?.substring(0, 20) + '...' || 'none',
      },
      'Socket authentication attempt'
    );

    if (!token) {
      logger.warn({ socketId: socket.id }, 'No token provided for socket connection');
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token using the same crypto utility as API
    logger.info(
      {
        socketId: socket.id,
        jwtSecretLength: process.env.JWT_ACCESS_SECRET?.length || 0,
        jwtSecretStart: process.env.JWT_ACCESS_SECRET?.substring(0, 8) + '...' || 'none',
      },
      'Using JWT secret for verification'
    );

    const decoded = verifyToken(token, 'access') as any;

    logger.info(
      {
        socketId: socket.id,
        decodedUserId: decoded?.userId,
        decodedEmail: decoded?.email,
        decodedExp: decoded?.exp,
        currentTime: Math.floor(Date.now() / 1000),
      },
      'Token decoded successfully'
    );

    if (!decoded || !decoded.userId) {
      logger.warn({ socketId: socket.id, decoded }, 'Invalid token payload');
      return next(new Error('Invalid token'));
    }

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      userType: decoded.userType,
    };

    logger.info(
      {
        socketId: socket.id,
        userId: decoded.userId,
        email: decoded.email,
      },
      'Socket authenticated successfully'
    );

    next();
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        socketId: socket.id,
        tokenProvided: !!token,
        tokenLength: token?.length || 0,
        jwtSecretLength: process.env.JWT_ACCESS_SECRET?.length || 0,
      },
      'Socket authentication failed'
    );
    next(new Error('Authentication failed'));
  }
}

export function requireAuth(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  if (!socket.userId) {
    return next(new Error('Authentication required'));
  }
  next();
}
