import { Socket } from 'socket.io';
import { logger } from '../app';
import { withConn } from '../config/db';
import oracledb from 'oracledb';
import { AuthenticatedSocket } from '../middlewares/socket-auth';

interface MessageData {
  sessionId: number;
  content: string;
  type: 'text' | 'image' | 'file';
  attendeeId?: number;
  senderId: number;
}

interface JoinConversationData {
  sessionId: number;
  userId: number;
}

interface TypingData {
  sessionId: number;
  userId: number;
  isTyping: boolean;
}

export function setupMessagingSocket(socket: AuthenticatedSocket) {
  logger.info(
    { socketId: socket.id, userId: socket.userId },
    'Setting up messaging socket handlers'
  );

  // Join conversation room
  socket.on('join-conversation', async (data: JoinConversationData) => {
    try {
      const { sessionId, userId } = data;

      // Validate session exists and user has access
      const sessionExists = await validateSessionAccess(sessionId, userId);
      if (!sessionExists) {
        socket.emit('error', { message: 'Session not found or access denied' });
        return;
      }

      // Join the session room
      socket.join(`session:${sessionId}`);
      socket.join(`user:${userId}`);

      logger.info(
        {
          socketId: socket.id,
          sessionId,
          userId,
        },
        'User joined conversation room'
      );

      socket.emit('joined-conversation', { sessionId, userId });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Error joining conversation');
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Leave conversation room
  socket.on('leave-conversation', (data: { sessionId: number; userId: number }) => {
    const { sessionId, userId } = data;
    socket.leave(`session:${sessionId}`);
    socket.leave(`user:${userId}`);

    logger.info(
      {
        socketId: socket.id,
        sessionId,
        userId,
      },
      'User left conversation room'
    );

    socket.emit('left-conversation', { sessionId, userId });
  });

  // Send message
  socket.on('send-message', async (data: MessageData) => {
    try {
      const { sessionId, content, type, attendeeId, senderId } = data;

      // Validate session access
      const sessionExists = await validateSessionAccess(sessionId, senderId);
      if (!sessionExists) {
        socket.emit('error', { message: 'Session not found or access denied' });
        return;
      }

      // Save message to database
      const messageId = await saveMessage({
        sessionId,
        content,
        type,
        attendeeId,
        senderId,
      });

      if (!messageId) {
        socket.emit('error', { message: 'Failed to save message' });
        return;
      }

      // Get message details for broadcasting
      const messageDetails = await getMessageDetails(messageId);
      if (!messageDetails) {
        socket.emit('error', { message: 'Failed to retrieve message details' });
        return;
      }

      // Broadcast message to all users in the session
      socket.to(`session:${sessionId}`).emit('new-message', messageDetails);

      // Also emit to sender for confirmation
      socket.emit('message-sent', messageDetails);

      logger.info(
        {
          socketId: socket.id,
          sessionId,
          messageId,
          senderId,
        },
        'Message sent and broadcasted'
      );
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Error sending message');
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data: TypingData) => {
    const { sessionId, userId, isTyping } = data;

    // Broadcast typing status to other users in the session
    socket.to(`session:${sessionId}`).emit('user-typing', {
      sessionId,
      userId,
      isTyping,
    });

    logger.debug(
      {
        socketId: socket.id,
        sessionId,
        userId,
        isTyping,
      },
      'Typing status updated'
    );
  });

  // Stop typing indicator
  socket.on('stop-typing', (data: { sessionId: number; userId: number }) => {
    const { sessionId, userId } = data;

    // Broadcast stop typing to other users in the session
    socket.to(`session:${sessionId}`).emit('user-stopped-typing', {
      sessionId,
      userId,
    });

    logger.debug(
      {
        socketId: socket.id,
        sessionId,
        userId,
      },
      'User stopped typing'
    );
  });

  // Mark message as read
  socket.on('mark-message-read', async (data: { messageId: number; userId: number }) => {
    try {
      const { messageId, userId } = data;

      await markMessageAsRead(messageId, userId);

      // Broadcast read status to other users
      socket.emit('message-read', { messageId, userId });

      logger.info(
        {
          socketId: socket.id,
          messageId,
          userId,
        },
        'Message marked as read'
      );
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Error marking message as read');
      socket.emit('error', { message: 'Failed to mark message as read' });
    }
  });

  // Get conversation history
  socket.on(
    'get-conversation-history',
    async (data: { sessionId: number; userId: number; limit?: number; offset?: number }) => {
      try {
        const { sessionId, userId, limit = 50, offset = 0 } = data;

        // Validate session access
        const sessionExists = await validateSessionAccess(sessionId, userId);
        if (!sessionExists) {
          socket.emit('error', { message: 'Session not found or access denied' });
          return;
        }

        const messages = await getConversationHistory(sessionId, limit, offset);

        socket.emit('conversation-history', {
          sessionId,
          messages,
          hasMore: messages.length === limit,
        });

        logger.info(
          {
            socketId: socket.id,
            sessionId,
            userId,
            messageCount: messages.length,
          },
          'Conversation history sent'
        );
      } catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error getting conversation history');
        socket.emit('error', { message: 'Failed to get conversation history' });
      }
    }
  );

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Messaging socket disconnected');
  });
}

// Helper functions
async function validateSessionAccess(sessionId: number, userId: number): Promise<boolean> {
  try {
    const result = await withConn(async conn => {
      const query = await conn.execute(
        `SELECT 1 FROM MESSAGING_SESSIONS ms 
         WHERE ms.ID = :sessionId 
         AND (ms.USER1_ID = :userId OR ms.USER2_ID = :userId)`,
        { sessionId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return query.rows && query.rows.length > 0;
    });
    return result;
  } catch (error) {
    logger.error({ error, sessionId, userId }, 'Error validating session access');
    return false;
  }
}

async function saveMessage(data: MessageData): Promise<number | null> {
  try {
    const result = await withConn(async conn => {
      const query = await conn.execute(
        `INSERT INTO MESSAGING_MESSAGES (
          SESSION_ID, CONTENT, MESSAGE_TYPE, ATTENDEE_ID, SENDER_ID, 
          CREATED_AT, IS_READ
        ) VALUES (
          :sessionId, :content, :type, :attendeeId, :senderId, 
          SYSTIMESTAMP, 0
        ) RETURNING ID INTO :messageId`,
        {
          sessionId: data.sessionId,
          content: data.content,
          type: data.type,
          attendeeId: data.attendeeId || null,
          senderId: data.senderId,
          messageId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      return (result.outBinds as { messageId: number[] }).messageId[0];
    });
    return result;
  } catch (error) {
    logger.error({ error, data }, 'Error saving message');
    return null;
  }
}

async function getMessageDetails(messageId: number): Promise<any | null> {
  try {
    const result = await withConn(async conn => {
      const query = await conn.execute(
        `SELECT 
          m.ID, m.SESSION_ID, m.CONTENT, m.MESSAGE_TYPE, 
          m.ATTENDEE_ID, m.SENDER_ID, m.CREATED_AT, m.IS_READ,
          u1.NAME as SENDER_NAME, u1.EMAIL as SENDER_EMAIL,
          u2.NAME as RECIPIENT_NAME, u2.EMAIL as RECIPIENT_EMAIL
        FROM MESSAGING_MESSAGES m
        LEFT JOIN APP_USERS u1 ON m.SENDER_ID = u1.ID
        LEFT JOIN APP_USERS u2 ON m.ATTENDEE_ID = u2.ID
        WHERE m.ID = :messageId`,
        { messageId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return query.rows?.[0] || null;
    });
    return result;
  } catch (error) {
    logger.error({ error, messageId }, 'Error getting message details');
    return null;
  }
}

async function markMessageAsRead(messageId: number, userId: number): Promise<void> {
  try {
    await withConn(async conn => {
      await conn.execute(
        `UPDATE MESSAGING_MESSAGES 
         SET IS_READ = 1, READ_AT = SYSTIMESTAMP
         WHERE ID = :messageId AND ATTENDEE_ID = :userId`,
        { messageId, userId },
        { autoCommit: true }
      );
    });
  } catch (error) {
    logger.error({ error, messageId, userId }, 'Error marking message as read');
    throw error;
  }
}

async function getConversationHistory(
  sessionId: number,
  limit: number,
  offset: number
): Promise<any[]> {
  try {
    const result = await withConn(async conn => {
      const query = await conn.execute(
        `SELECT 
          m.ID, m.SESSION_ID, m.CONTENT, m.MESSAGE_TYPE, 
          m.ATTENDEE_ID, m.SENDER_ID, m.CREATED_AT, m.IS_READ,
          u1.NAME as SENDER_NAME, u1.EMAIL as SENDER_EMAIL,
          u2.NAME as RECIPIENT_NAME, u2.EMAIL as RECIPIENT_EMAIL
        FROM MESSAGING_MESSAGES m
        LEFT JOIN APP_USERS u1 ON m.SENDER_ID = u1.ID
        LEFT JOIN APP_USERS u2 ON m.ATTENDEE_ID = u2.ID
        WHERE m.SESSION_ID = :sessionId
        ORDER BY m.CREATED_AT DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        { sessionId, limit, offset },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return query.rows || [];
    });
    return result;
  } catch (error) {
    logger.error({ error, sessionId, limit, offset }, 'Error getting conversation history');
    return [];
  }
}
