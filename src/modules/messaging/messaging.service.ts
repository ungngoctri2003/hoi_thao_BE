import { withConn } from '../../config/db';
import oracledb from 'oracledb';
import { logger } from '../../app';

export interface Message {
  id: number;
  sessionId: number;
  content: string;
  messageType: 'text' | 'image' | 'file';
  senderId: number;
  attendeeId?: number;
  createdAt: Date;
  isRead: boolean;
  readAt?: Date;
}

export interface MessagingSession {
  id: number;
  user1Id: number;
  user2Id: number;
  conferenceId?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MessagingUser {
  id: number;
  userId: number;
  conferenceId?: number;
  addedAt: Date;
  isActive: boolean;
}

export class MessagingService {
  // Get or create a messaging session between two users
  async getOrCreateSession(
    user1Id: number,
    user2Id: number,
    conferenceId?: number
  ): Promise<number> {
    try {
      const result = await withConn(async conn => {
        // First, try to find existing session
        const existingSession = await conn.execute(
          `SELECT ID FROM MESSAGING_SESSIONS 
           WHERE ((USER1_ID = :user1Id AND USER2_ID = :user2Id) 
                  OR (USER1_ID = :user2Id AND USER2_ID = :user1Id))
           AND (:conferenceId IS NULL OR CONFERENCE_ID = :conferenceId)
           AND IS_ACTIVE = 1
           ORDER BY CREATED_AT DESC
           FETCH FIRST 1 ROWS ONLY`,
          { user1Id, user2Id, conferenceId: conferenceId || null },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existingSession.rows && existingSession.rows.length > 0) {
          return (existingSession.rows[0] as any).ID;
        }

        // Create new session
        const createResult = await conn.execute(
          `INSERT INTO MESSAGING_SESSIONS (USER1_ID, USER2_ID, CONFERENCE_ID, IS_ACTIVE)
           VALUES (:user1Id, :user2Id, :conferenceId, 1)
           RETURNING ID INTO :sessionId`,
          {
            user1Id,
            user2Id,
            conferenceId: conferenceId || null,
            sessionId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: true }
        );

        return (createResult.outBinds as { sessionId: number[] }).sessionId[0];
      });

      logger.info(
        { user1Id, user2Id, conferenceId, sessionId: result },
        'Session created/retrieved'
      );
      return result;
    } catch (error) {
      logger.error({ error, user1Id, user2Id, conferenceId }, 'Error getting/creating session');
      throw error;
    }
  }

  // Get messages for a session
  async getSessionMessages(
    sessionId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const result = await withConn(async conn => {
        const query = await conn.execute(
          `SELECT 
            m.ID, m.SESSION_ID, m.CONTENT, m.MESSAGE_TYPE, 
            m.ATTENDEE_ID, m.SENDER_ID, m.CREATED_AT, m.IS_READ, m.READ_AT
          FROM MESSAGING_MESSAGES m
          WHERE m.SESSION_ID = :sessionId
          ORDER BY m.CREATED_AT DESC
          OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
          { sessionId, limit, offset },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return query.rows || [];
      });

      return result.map((row: any) => ({
        id: row.ID,
        sessionId: row.SESSION_ID,
        content: row.CONTENT,
        messageType: row.MESSAGE_TYPE,
        senderId: row.SENDER_ID,
        attendeeId: row.ATTENDEE_ID,
        createdAt: row.CREATED_AT,
        isRead: row.IS_READ === 1,
        readAt: row.READ_AT,
      }));
    } catch (error) {
      logger.error({ error, sessionId }, 'Error getting session messages');
      throw error;
    }
  }

  // Send a message
  async sendMessage(
    sessionId: number,
    content: string,
    messageType: 'text' | 'image' | 'file',
    senderId: number,
    attendeeId?: number
  ): Promise<Message> {
    try {
      const result = await withConn(async conn => {
        const insertResult = await conn.execute(
          `INSERT INTO MESSAGING_MESSAGES (
            SESSION_ID, CONTENT, MESSAGE_TYPE, SENDER_ID, ATTENDEE_ID, 
            CREATED_AT, IS_READ
          ) VALUES (
            :sessionId, :content, :messageType, :senderId, :attendeeId, 
            SYSTIMESTAMP, 0
          ) RETURNING ID INTO :messageId`,
          {
            sessionId,
            content,
            messageType,
            senderId,
            attendeeId: attendeeId || null,
            messageId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          },
          { autoCommit: true }
        );

        const messageId = (insertResult.outBinds as { messageId: number[] }).messageId[0];

        // Get the created message
        const messageQuery = await conn.execute(
          `SELECT 
            m.ID, m.SESSION_ID, m.CONTENT, m.MESSAGE_TYPE, 
            m.ATTENDEE_ID, m.SENDER_ID, m.CREATED_AT, m.IS_READ, m.READ_AT
          FROM MESSAGING_MESSAGES m
          WHERE m.ID = :messageId`,
          { messageId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return messageQuery.rows?.[0] || null;
      });

      if (!result) {
        throw new Error('Failed to create message');
      }

      return {
        id: result.ID,
        sessionId: result.SESSION_ID,
        content: result.CONTENT,
        messageType: result.MESSAGE_TYPE,
        senderId: result.SENDER_ID,
        attendeeId: result.ATTENDEE_ID,
        createdAt: result.CREATED_AT,
        isRead: result.IS_READ === 1,
        readAt: result.READ_AT,
      };
    } catch (error) {
      logger.error({ error, sessionId, senderId }, 'Error sending message');
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
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

      logger.info({ messageId, userId }, 'Message marked as read');
    } catch (error) {
      logger.error({ error, messageId, userId }, 'Error marking message as read');
      throw error;
    }
  }

  // Get users with messages for a conference
  async getUsersWithMessages(conferenceId?: number): Promise<any[]> {
    try {
      const result = await withConn(async conn => {
        const query = await conn.execute(
          `SELECT DISTINCT
            u.ID, u.NAME, u.EMAIL, u.PHONE, u.COMPANY, u.POSITION, u.AVATAR_URL,
            u.ROLE, u.USER_TYPE,
            c.NAME as CONFERENCE_NAME,
            COUNT(m.ID) as MESSAGE_COUNT,
            MAX(m.CREATED_AT) as LAST_MESSAGE_TIME
          FROM APP_USERS u
          LEFT JOIN MESSAGING_USERS mu ON u.ID = mu.USER_ID
          LEFT JOIN CONFERENCES c ON mu.CONFERENCE_ID = c.ID
          LEFT JOIN MESSAGING_SESSIONS ms ON (ms.USER1_ID = u.ID OR ms.USER2_ID = u.ID)
          LEFT JOIN MESSAGING_MESSAGES m ON ms.ID = m.SESSION_ID
          WHERE mu.IS_ACTIVE = 1
          AND (:conferenceId IS NULL OR mu.CONFERENCE_ID = :conferenceId)
          GROUP BY u.ID, u.NAME, u.EMAIL, u.PHONE, u.COMPANY, u.POSITION, u.AVATAR_URL,
                   u.ROLE, u.USER_TYPE, c.NAME
          ORDER BY LAST_MESSAGE_TIME DESC NULLS LAST`,
          { conferenceId: conferenceId || null },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return query.rows || [];
      });

      return result.map((row: any) => ({
        id: row.ID,
        name: row.NAME,
        email: row.EMAIL,
        phone: row.PHONE || '',
        company: row.COMPANY || '',
        position: row.POSITION || '',
        avatar: row.AVATAR_URL,
        role: row.ROLE,
        userType: row.USER_TYPE,
        conferenceId: conferenceId,
        conferenceName: row.CONFERENCE_NAME,
        messageCount: row.MESSAGE_COUNT || 0,
        lastMessageTime: row.LAST_MESSAGE_TIME
          ? new Date(row.LAST_MESSAGE_TIME).toLocaleString('vi-VN')
          : 'Chưa có tin nhắn',
        isOnline: Math.random() > 0.5, // Mock online status
        lastSeen: 'Không xác định',
        lastMessage: undefined,
        unreadCount: 0,
      }));
    } catch (error) {
      logger.error({ error, conferenceId }, 'Error getting users with messages');
      throw error;
    }
  }

  // Add user to messaging system
  async addUserToMessaging(
    userId: number,
    conferenceId?: number
  ): Promise<{ added: boolean; message: string }> {
    try {
      const result = await withConn(async conn => {
        // Check if user already exists in messaging
        const existingUser = await conn.execute(
          `SELECT ID FROM MESSAGING_USERS 
           WHERE USER_ID = :userId 
           AND (:conferenceId IS NULL OR CONFERENCE_ID = :conferenceId)
           AND IS_ACTIVE = 1`,
          { userId, conferenceId: conferenceId || null },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existingUser.rows && existingUser.rows.length > 0) {
          return { added: false, message: 'User already exists in messaging system' };
        }

        // Add user to messaging
        await conn.execute(
          `INSERT INTO MESSAGING_USERS (USER_ID, CONFERENCE_ID, IS_ACTIVE)
           VALUES (:userId, :conferenceId, 1)`,
          { userId, conferenceId: conferenceId || null },
          { autoCommit: true }
        );

        return { added: true, message: 'User added to messaging system successfully' };
      });

      logger.info({ userId, conferenceId, result }, 'User added to messaging');
      return result;
    } catch (error) {
      logger.error({ error, userId, conferenceId }, 'Error adding user to messaging');
      throw error;
    }
  }

  // Get available users for messaging
  async getAvailableUsers(conferenceId?: number): Promise<any[]> {
    try {
      const result = await withConn(async conn => {
        const query = await conn.execute(
          `SELECT 
            u.ID, u.NAME, u.EMAIL, u.PHONE, u.COMPANY, u.POSITION, u.AVATAR_URL,
            u.ROLE, u.USER_TYPE,
            c.NAME as CONFERENCE_NAME,
            CASE 
              WHEN mu.USER_ID IS NOT NULL THEN 'conference'
              WHEN u.ROLE IN ('admin', 'staff') THEN 'system'
              ELSE 'non_conference'
            END as CATEGORY
          FROM APP_USERS u
          LEFT JOIN MESSAGING_USERS mu ON u.ID = mu.USER_ID AND mu.IS_ACTIVE = 1
          LEFT JOIN CONFERENCES c ON mu.CONFERENCE_ID = c.ID
          WHERE u.IS_ACTIVE = 1
          ORDER BY u.NAME`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return query.rows || [];
      });

      return result.map((row: any) => ({
        id: row.ID,
        name: row.NAME,
        email: row.EMAIL,
        phone: row.PHONE || '',
        company: row.COMPANY || '',
        position: row.POSITION || '',
        avatar: row.AVATAR_URL,
        role: row.ROLE,
        userType: row.USER_TYPE,
        conferenceId: conferenceId,
        conferenceName: row.CONFERENCE_NAME,
        category: row.CATEGORY,
      }));
    } catch (error) {
      logger.error({ error, conferenceId }, 'Error getting available users');
      throw error;
    }
  }
}

export const messagingService = new MessagingService();
