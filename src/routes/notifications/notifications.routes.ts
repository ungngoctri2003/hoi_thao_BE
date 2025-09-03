import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { emitUserNotification } from '../../sockets';
import { notificationsRepository } from '../../modules/notifications/notifications.repository.oracle';
import { usersRepository } from '../../modules/users/users.repository';
import { logger } from '../../app';

const notificationsRouter = Router();

// Get user's notifications
notificationsRouter.get('/', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { 
      type, 
      category, 
      is_read, 
      is_archived, 
      limit = 20, 
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const filters = {
      type: type as string,
      category: category as string,
      is_read: is_read ? is_read === 'true' : undefined,
      is_archived: is_archived ? is_archived === 'true' : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sort_by: sort_by as 'created_at' | 'updated_at',
      sort_order: sort_order as 'ASC' | 'DESC'
    };

    const notifications = await notificationsRepository.findByUserId(userId, filters);
    const stats = await notificationsRepository.getStats(userId);

    res.json({
      success: true,
      data: {
        notifications,
        stats,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: stats.total_notifications
        }
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get notifications');
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
});

// Get notification statistics
notificationsRouter.get('/stats', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const stats = await notificationsRepository.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get notification stats');
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
});

// Mark notification as read
notificationsRouter.patch('/:id/read', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const success = await notificationsRepository.markAsRead(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, notificationId: req.params.id }, 'Failed to mark notification as read');
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
notificationsRouter.patch('/read-all', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const updatedCount = await notificationsRepository.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount }
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to mark all notifications as read');
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Archive notification
notificationsRouter.patch('/:id/archive', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const success = await notificationsRepository.archive(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification archived'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, notificationId: req.params.id }, 'Failed to archive notification');
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    });
  }
});

// Delete notification
notificationsRouter.delete('/:id', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const success = await notificationsRepository.delete(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, notificationId: req.params.id }, 'Failed to delete notification');
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// Get notification preferences
notificationsRouter.get('/preferences', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await notificationsRepository.getPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get notification preferences');
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences'
    });
  }
});

// Update notification preferences
notificationsRouter.patch('/preferences', auth(), async (req, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await notificationsRepository.updatePreferences(userId, req.body);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id, preferences: req.body }, 'Failed to update notification preferences');
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

// Send notification to specific user (Admin only)
notificationsRouter.post('/send/:userId', auth(), async (req, res) => {
  try {
    const senderId = req.user!.id;
    const { userId } = req.params;
    const { title, message, type = 'info', category = 'general', data, expires_at } = req.body;

    // Check if sender is admin
    const sender = await usersRepository.findById(senderId);
    const senderRoles = await usersRepository.listRoles(senderId);
    const isAdmin = senderRoles.some(role => role.CODE === 'admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can send notifications'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Create notification in database
    const notification = await notificationsRepository.create({
      user_id: parseInt(userId),
      title,
      message,
      type,
      category,
      data,
      expires_at: expires_at ? new Date(expires_at) : undefined
    });

    // Emit notification via WebSocket
    emitUserNotification(parseInt(userId), {
      type: 'system_notification',
      title,
      message,
      notificationType: type,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    logger.error({ error, senderId: req.user?.id, userId: req.params.userId }, 'Failed to send notification');
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// Send notification from template (Admin only)
notificationsRouter.post('/send-template/:userId', auth(), async (req, res) => {
  try {
    const senderId = req.user!.id;
    const { userId } = req.params;
    const { template_name, variables, data, expires_at } = req.body;

    // Check if sender is admin
    const sender = await usersRepository.findById(senderId);
    const senderRoles = await usersRepository.listRoles(senderId);
    const isAdmin = senderRoles.some(role => role.CODE === 'admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can send notifications'
      });
    }

    if (!template_name) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Create notification from template
    const notification = await notificationsRepository.createFromTemplate({
      user_id: parseInt(userId),
      template_name,
      variables,
      data,
      expires_at: expires_at ? new Date(expires_at) : undefined
    });

    // Emit notification via WebSocket
    emitUserNotification(parseInt(userId), {
      type: 'system_notification',
      title: notification.title,
      message: notification.message,
      notificationType: notification.type,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    logger.error({ error, senderId: req.user?.id, userId: req.params.userId }, 'Failed to send notification from template');
    res.status(500).json({
      success: false,
      message: 'Failed to send notification from template'
    });
  }
});

// Broadcast notification to all users (Admin only)
notificationsRouter.post('/broadcast', auth(), async (req, res) => {
  try {
    const senderId = req.user!.id;
    const { title, message, type = 'info', category = 'general', data, expires_at } = req.body;

    // Check if sender is admin
    const sender = await usersRepository.findById(senderId);
    const senderRoles = await usersRepository.listRoles(senderId);
    const isAdmin = senderRoles.some(role => role.CODE === 'admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can broadcast notifications'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Get all active users
    const allUsers = await usersRepository.findAll();
    const userIds = allUsers.map(user => user.ID);

    // Create notifications in database
    const createdCount = await notificationsRepository.broadcast(
      userIds,
      title,
      message,
      type,
      category,
      data
    );

    // Emit notification to all connected users via WebSocket
    emitUserNotification('all', {
      type: 'system_notification',
      title,
      message,
      notificationType: type,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Broadcast notification sent successfully',
      data: { createdCount, totalUsers: userIds.length }
    });
  } catch (error) {
    logger.error({ error, senderId: req.user?.id }, 'Failed to broadcast notification');
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification'
    });
  }
});

// Broadcast notification from template (Admin only)
notificationsRouter.post('/broadcast-template', auth(), async (req, res) => {
  try {
    const senderId = req.user!.id;
    const { template_name, variables, data, expires_at } = req.body;

    // Check if sender is admin
    const sender = await usersRepository.findById(senderId);
    const senderRoles = await usersRepository.listRoles(senderId);
    const isAdmin = senderRoles.some(role => role.CODE === 'admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can broadcast notifications'
      });
    }

    if (!template_name) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Get template
    const template = await notificationsRepository.getTemplate(template_name);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Replace variables in template
    let title = template.title_template;
    let message = template.message_template;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), String(value));
        message = message.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }

    // Get all active users
    const allUsers = await usersRepository.findAll();
    const userIds = allUsers.map(user => user.ID);

    // Create notifications in database
    const createdCount = await notificationsRepository.broadcast(
      userIds,
      title,
      message,
      template.type,
      template.category,
      data
    );

    // Emit notification to all connected users via WebSocket
    emitUserNotification('all', {
      type: 'system_notification',
      title,
      message,
      notificationType: template.type,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Broadcast notification sent successfully',
      data: { createdCount, totalUsers: userIds.length }
    });
  } catch (error) {
    logger.error({ error, senderId: req.user?.id }, 'Failed to broadcast notification from template');
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification from template'
    });
  }
});

// Cleanup expired notifications (Admin only)
notificationsRouter.post('/cleanup', auth(), async (req, res) => {
  try {
    const senderId = req.user!.id;

    // Check if sender is admin
    const sender = await usersRepository.findById(senderId);
    const senderRoles = await usersRepository.listRoles(senderId);
    const isAdmin = senderRoles.some(role => role.CODE === 'admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can cleanup notifications'
      });
    }

    const deletedCount = await notificationsRepository.cleanupExpired();

    res.json({
      success: true,
      message: 'Expired notifications cleaned up',
      data: { deletedCount }
    });
  } catch (error) {
    logger.error({ error, senderId: req.user?.id }, 'Failed to cleanup notifications');
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications'
    });
  }
});

export default notificationsRouter;
