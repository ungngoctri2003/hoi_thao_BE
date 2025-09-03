import { withConn } from '../../config/db';
import oracledb from 'oracledb';
import { 
  Notification, 
  NotificationTemplate, 
  NotificationPreference, 
  NotificationLog,
  CreateNotificationData,
  CreateNotificationFromTemplateData,
  NotificationFilters,
  NotificationStats
} from './notifications.types';
import { logger } from '../../app';

export class NotificationsRepository {
  // Create a new notification
  async create(data: CreateNotificationData): Promise<Notification> {
    return withConn(async (conn) => {
      const query = `
        INSERT INTO notifications (user_id, title, message, type, category, data, expires_at)
        VALUES (:user_id, :title, :message, :type, :category, :data, :expires_at)
        RETURNING id INTO :id
      `;
      
      const bindParams = {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        category: data.category || 'general',
        data: data.data ? JSON.stringify(data.data) : null,
        expires_at: data.expires_at || null,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };

      try {
        const result = await conn.execute(query, bindParams, { autoCommit: true });
        const notificationId = (result.outBinds as { id: number[] }).id[0];
        
        // Log the notification creation
        await this.logNotification(notificationId, data.user_id, 'in_app', 'sent');
        
        return await this.findById(notificationId);
      } catch (error) {
        logger.error({ error, data }, 'Failed to create notification');
        throw error;
      }
    });
  }

  // Create notification from template
  async createFromTemplate(data: CreateNotificationFromTemplateData): Promise<Notification> {
    const template = await this.getTemplate(data.template_name);
    if (!template) {
      throw new Error(`Template ${data.template_name} not found`);
    }

    // Replace variables in template
    let title = template.title_template;
    let message = template.message_template;

    if (data.variables) {
      Object.entries(data.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), String(value));
        message = message.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }

    return this.create({
      user_id: data.user_id,
      title,
      message,
      type: template.type,
      category: template.category,
      data: data.data,
      expires_at: data.expires_at
    });
  }

  // Find notification by ID
  async findById(id: number): Promise<Notification | null> {
    const query = `
      SELECT * FROM notifications 
      WHERE id = ? AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    try {
      const [rows] = await pool.execute(query, [id]);
      const notifications = rows as Notification[];
      return notifications.length > 0 ? notifications[0] : null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find notification by ID');
      throw error;
    }
  }

  // Get notifications for a user with filters
  async findByUserId(userId: number, filters: NotificationFilters = {}): Promise<Notification[]> {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const values: any[] = [userId];

    // Apply filters
    if (filters.type) {
      query += ' AND type = ?';
      values.push(filters.type);
    }

    if (filters.category) {
      query += ' AND category = ?';
      values.push(filters.category);
    }

    if (filters.is_read !== undefined) {
      query += ' AND is_read = ?';
      values.push(filters.is_read);
    }

    if (filters.is_archived !== undefined) {
      query += ' AND is_archived = ?';
      values.push(filters.is_archived);
    }

    // Sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
      
      if (filters.offset) {
        query += ' OFFSET ?';
        values.push(filters.offset);
      }
    }

    try {
      const [rows] = await pool.execute(query, values);
      return rows as Notification[];
    } catch (error) {
      logger.error({ error, userId, filters }, 'Failed to find notifications by user ID');
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(id: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [id, userId]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      logger.error({ error, id, userId }, 'Failed to mark notification as read');
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<number> {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = FALSE
    `;

    try {
      const [result] = await pool.execute(query, [userId]);
      return (result as any).affectedRows;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to mark all notifications as read');
      throw error;
    }
  }

  // Archive notification
  async archive(id: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [id, userId]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      logger.error({ error, id, userId }, 'Failed to archive notification');
      throw error;
    }
  }

  // Delete notification
  async delete(id: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [id, userId]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      logger.error({ error, id, userId }, 'Failed to delete notification');
      throw error;
    }
  }

  // Get notification statistics for a user
  async getStats(userId: number): Promise<NotificationStats> {
    const query = `
      SELECT 
        COUNT(*) as total_notifications,
        SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
        SUM(CASE WHEN is_archived = FALSE THEN 1 ELSE 0 END) as active_count
      FROM notifications 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
    `;

    try {
      const [rows] = await pool.execute(query, [userId]);
      const stats = (rows as any)[0];
      return {
        total_notifications: parseInt(stats.total_notifications) || 0,
        unread_count: parseInt(stats.unread_count) || 0,
        active_count: parseInt(stats.active_count) || 0
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get notification stats');
      throw error;
    }
  }

  // Get notification template
  async getTemplate(name: string): Promise<NotificationTemplate | null> {
    const query = `
      SELECT * FROM notification_templates 
      WHERE name = ? AND is_active = TRUE
    `;

    try {
      const [rows] = await pool.execute(query, [name]);
      const templates = rows as NotificationTemplate[];
      return templates.length > 0 ? templates[0] : null;
    } catch (error) {
      logger.error({ error, name }, 'Failed to get notification template');
      throw error;
    }
  }

  // Get user notification preferences
  async getPreferences(userId: number): Promise<NotificationPreference | null> {
    const query = `
      SELECT * FROM notification_preferences 
      WHERE user_id = ?
    `;

    try {
      const [rows] = await pool.execute(query, [userId]);
      const preferences = rows as NotificationPreference[];
      return preferences.length > 0 ? preferences[0] : null;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get notification preferences');
      throw error;
    }
  }

  // Update user notification preferences
  async updatePreferences(userId: number, preferences: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const fields = [];
    const values = [];

    Object.entries(preferences).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    const query = `
      UPDATE notification_preferences 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    try {
      await pool.execute(query, values);
      return await this.getPreferences(userId) as NotificationPreference;
    } catch (error) {
      logger.error({ error, userId, preferences }, 'Failed to update notification preferences');
      throw error;
    }
  }

  // Log notification delivery
  async logNotification(
    notificationId: number, 
    userId: number, 
    deliveryMethod: 'in_app' | 'email' | 'push',
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const query = `
      INSERT INTO notification_logs (notification_id, user_id, delivery_method, status, error_message, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      notificationId,
      userId,
      deliveryMethod,
      status,
      errorMessage || null,
      status === 'sent' || status === 'delivered' ? new Date() : null
    ];

    try {
      await pool.execute(query, values);
    } catch (error) {
      logger.error({ error, notificationId, userId, deliveryMethod, status }, 'Failed to log notification');
    }
  }

  // Clean up expired notifications
  async cleanupExpired(): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    try {
      const [result] = await pool.execute(query);
      const deletedCount = (result as any).affectedRows;
      logger.info({ deletedCount }, 'Cleaned up expired notifications');
      return deletedCount;
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired notifications');
      throw error;
    }
  }

  // Broadcast notification to multiple users
  async broadcast(
    userIds: number[], 
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    category: 'system' | 'permission' | 'conference' | 'session' | 'registration' | 'general' = 'general',
    data?: any
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const query = `
      INSERT INTO notifications (user_id, title, message, type, category, data)
      VALUES ${userIds.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}
    `;

    const values: any[] = [];
    userIds.forEach(userId => {
      values.push(userId, title, message, type, category, data ? JSON.stringify(data) : null);
    });

    try {
      const [result] = await pool.execute(query, values);
      const createdCount = (result as any).affectedRows;
      
      // Log each notification
      for (let i = 0; i < userIds.length; i++) {
        await this.logNotification(
          (result as any).insertId + i, 
          userIds[i], 
          'in_app', 
          'sent'
        );
      }

      logger.info({ createdCount, userIds: userIds.length }, 'Broadcast notifications created');
      return createdCount;
    } catch (error) {
      logger.error({ error, userIds, title, message }, 'Failed to broadcast notifications');
      throw error;
    }
  }
}

export const notificationsRepository = new NotificationsRepository();
