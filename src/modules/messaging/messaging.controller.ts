import { Request, Response } from 'express';
import { messagingService } from './messaging.service';
import { logger } from '../../app';

export class MessagingController {
  // Get or create conversation session
  async getOrCreateSession(req: Request, res: Response) {
    try {
      const { user1Id, user2Id, conferenceId } = req.body;

      if (!user1Id || !user2Id) {
        return res.status(400).json({
          success: false,
          error: 'user1Id and user2Id are required',
        });
      }

      const sessionId = await messagingService.getOrCreateSession(user1Id, user2Id, conferenceId);

      return res.json({
        success: true,
        data: { sessionId },
      });
    } catch (error) {
      logger.error({ error }, 'Error getting/creating session');
      return res.status(500).json({
        success: false,
        error: 'Failed to get/create session',
      });
    }
  }

  // Get session messages
  async getSessionMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const messages = await messagingService.getSessionMessages(
        Number(sessionId),
        Number(limit),
        Number(offset)
      );

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Error getting session messages');
      res.status(500).json({
        success: false,
        error: 'Failed to get session messages',
      });
    }
  }

  // Send message
  async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId, content, messageType = 'text', attendeeId } = req.body;
      const senderId = (req as any).user?.id;

      if (!sessionId || !content || !senderId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, content, and senderId are required',
        });
      }

      const message = await messagingService.sendMessage(
        sessionId,
        content,
        messageType,
        senderId,
        attendeeId
      );

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error({ error }, 'Error sending message');
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
      });
    }
  }

  // Mark message as read
  async markMessageAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = (req as any).user?.id;

      if (!messageId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'messageId and userId are required',
        });
      }

      await messagingService.markMessageAsRead(Number(messageId), userId);

      res.json({
        success: true,
        message: 'Message marked as read',
      });
    } catch (error) {
      logger.error({ error }, 'Error marking message as read');
      res.status(500).json({
        success: false,
        error: 'Failed to mark message as read',
      });
    }
  }

  // Get users with messages
  async getUsersWithMessages(req: Request, res: Response) {
    try {
      const { conferenceId } = req.query;

      const users = await messagingService.getUsersWithMessages(
        conferenceId ? Number(conferenceId) : undefined
      );

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error({ error }, 'Error getting users with messages');
      res.status(500).json({
        success: false,
        error: 'Failed to get users with messages',
      });
    }
  }

  // Add user to messaging
  async addUserToMessaging(req: Request, res: Response) {
    try {
      const { userId, conferenceId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
        });
      }

      const result = await messagingService.addUserToMessaging(userId, conferenceId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Error adding user to messaging');
      res.status(500).json({
        success: false,
        error: 'Failed to add user to messaging',
      });
    }
  }

  // Get available users
  async getAvailableUsers(req: Request, res: Response) {
    try {
      const { conferenceId } = req.query;

      const users = await messagingService.getAvailableUsers(
        conferenceId ? Number(conferenceId) : undefined
      );

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error({ error }, 'Error getting available users');
      res.status(500).json({
        success: false,
        error: 'Failed to get available users',
      });
    }
  }
}

export const messagingController = new MessagingController();
