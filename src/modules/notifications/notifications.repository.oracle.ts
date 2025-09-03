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
    return withConn(async (conn) => {
      const query = `
        SELECT * FROM notifications 
        WHERE id = :id AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;
      
      try {
        const result = await conn.execute(query, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = result.rows as any[];
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        logger.error({ error, id }, 'Failed to find notification by ID');
        throw error;
      }
    });
  }

  // Get notifications for a user with filters
  async findByUserId(userId: number, filters: NotificationFilters = {}): Promise<Notification[]> {
    return withConn(async (conn) => {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = :userId AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;
      const bindParams: any = { userId };

      // Apply filters
      if (filters.type) {
        query += ' AND type = :type';
        bindParams.type = filters.type;
      }

      if (filters.category) {
        query += ' AND category = :category';
        bindParams.category = filters.category;
      }

      if (filters.is_read !== undefined) {
        query += ' AND is_read = :is_read';
        bindParams.is_read = filters.is_read ? 1 : 0;
      }

      if (filters.is_archived !== undefined) {
        query += ' AND is_archived = :is_archived';
        bindParams.is_archived = filters.is_archived ? 1 : 0;
      }

      // Sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Pagination
      if (filters.limit) {
        query += ` FETCH FIRST ${filters.limit} ROWS ONLY`;
        
        if (filters.offset) {
          query = `
            SELECT * FROM (
              SELECT a.*, ROWNUM rn FROM (${query}) a WHERE ROWNUM <= :maxRow
            ) WHERE rn > :minRow
          `;
          bindParams.maxRow = filters.offset + filters.limit;
          bindParams.minRow = filters.offset;
        }
      }

      try {
        const result = await conn.execute(query, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows as Notification[];
      } catch (error) {
        logger.error({ error, userId, filters }, 'Failed to find notifications by user ID');
        throw error;
      }
    });
  }

  // Mark notification as read
  async markAsRead(id: number, userId: number): Promise<boolean> {
    return withConn(async (conn) => {
      const query = `
        UPDATE notifications 
        SET is_read = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = :id AND user_id = :userId
      `;

      try {
        const result = await conn.execute(query, { id, userId }, { autoCommit: true });
        return (result.rowsAffected as number) > 0;
      } catch (error) {
        logger.error({ error, id, userId }, 'Failed to mark notification as read');
        throw error;
      }
    });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<number> {
    return withConn(async (conn) => {
      const query = `
        UPDATE notifications 
        SET is_read = 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :userId AND is_read = 0
      `;

      try {
        const result = await conn.execute(query, { userId }, { autoCommit: true });
        return result.rowsAffected as number;
      } catch (error) {
        logger.error({ error, userId }, 'Failed to mark all notifications as read');
        throw error;
      }
    });
  }

  // Archive notification
  async archive(id: number, userId: number): Promise<boolean> {
    return withConn(async (conn) => {
      const query = `
        UPDATE notifications 
        SET is_archived = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = :id AND user_id = :userId
      `;

      try {
        const result = await conn.execute(query, { id, userId }, { autoCommit: true });
        return (result.rowsAffected as number) > 0;
      } catch (error) {
        logger.error({ error, id, userId }, 'Failed to archive notification');
        throw error;
      }
    });
  }

  // Delete notification
  async delete(id: number, userId: number): Promise<boolean> {
    return withConn(async (conn) => {
      const query = `
        DELETE FROM notifications 
        WHERE id = :id AND user_id = :userId
      `;

      try {
        const result = await conn.execute(query, { id, userId }, { autoCommit: true });
        return (result.rowsAffected as number) > 0;
      } catch (error) {
        logger.error({ error, id, userId }, 'Failed to delete notification');
        throw error;
      }
    });
  }

  // Get notification statistics for a user
  async getStats(userId: number): Promise<NotificationStats> {
    return withConn(async (conn) => {
      const query = `
        SELECT 
          COUNT(*) as total_notifications,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
          SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) as active_count
        FROM notifications 
        WHERE user_id = :userId AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;

      try {
        const result = await conn.execute(query, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const stats = result.rows[0] as any;
        return {
          total_notifications: parseInt(stats.TOTAL_NOTIFICATIONS) || 0,
          unread_count: parseInt(stats.UNREAD_COUNT) || 0,
          active_count: parseInt(stats.ACTIVE_COUNT) || 0
        };
      } catch (error) {
        logger.error({ error, userId }, 'Failed to get notification stats');
        throw error;
      }
    });
  }

  // Get notification template
  async getTemplate(name: string): Promise<NotificationTemplate | null> {
    return withConn(async (conn) => {
      const query = `
        SELECT * FROM notification_templates 
        WHERE name = :name AND is_active = 1
      `;

      try {
        const result = await conn.execute(query, { name }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = result.rows as any[];
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        logger.error({ error, name }, 'Failed to get notification template');
        throw error;
      }
    });
  }

  // Get user notification preferences
  async getPreferences(userId: number): Promise<NotificationPreference | null> {
    return withConn(async (conn) => {
      const query = `
        SELECT * FROM notification_preferences 
        WHERE user_id = :userId
      `;

      try {
        const result = await conn.execute(query, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = result.rows as any[];
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        logger.error({ error, userId }, 'Failed to get notification preferences');
        throw error;
      }
    });
  }

  // Update user notification preferences
  async updatePreferences(userId: number, preferences: Partial<NotificationPreference>): Promise<NotificationPreference> {
    return withConn(async (conn) => {
      const fields = [];
      const bindParams: any = { userId };

      Object.entries(preferences).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && value !== undefined) {
          fields.push(`${key.toUpperCase()} = :${key}`);
          bindParams[key] = value;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE notification_preferences 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = :userId
      `;

      try {
        await conn.execute(query, bindParams, { autoCommit: true });
        return await this.getPreferences(userId) as NotificationPreference;
      } catch (error) {
        logger.error({ error, userId, preferences }, 'Failed to update notification preferences');
        throw error;
      }
    });
  }

  // Log notification delivery
  async logNotification(
    notificationId: number, 
    userId: number, 
    deliveryMethod: 'in_app' | 'email' | 'push',
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    return withConn(async (conn) => {
      const query = `
        INSERT INTO notification_logs (notification_id, user_id, delivery_method, status, error_message, sent_at)
        VALUES (:notification_id, :user_id, :delivery_method, :status, :error_message, :sent_at)
      `;

      const bindParams = {
        notification_id: notificationId,
        user_id: userId,
        delivery_method: deliveryMethod,
        status,
        error_message: errorMessage || null,
        sent_at: status === 'sent' || status === 'delivered' ? new Date() : null
      };

      try {
        await conn.execute(query, bindParams, { autoCommit: true });
      } catch (error) {
        logger.error({ error, notificationId, userId, deliveryMethod, status }, 'Failed to log notification');
      }
    });
  }

  // Clean up expired notifications
  async cleanupExpired(): Promise<number> {
    return withConn(async (conn) => {
      const query = `
        DELETE FROM notifications 
        WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
      `;

      try {
        const result = await conn.execute(query, {}, { autoCommit: true });
        const deletedCount = result.rowsAffected as number;
        logger.info({ deletedCount }, 'Cleaned up expired notifications');
        return deletedCount;
      } catch (error) {
        logger.error({ error }, 'Failed to cleanup expired notifications');
        throw error;
      }
    });
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

    return withConn(async (conn) => {
      let createdCount = 0;
      
      try {
        for (const userId of userIds) {
          const query = `
            INSERT INTO notifications (user_id, title, message, type, category, data)
            VALUES (:user_id, :title, :message, :type, :category, :data)
          `;

          const bindParams = {
            user_id: userId,
            title,
            message,
            type,
            category,
            data: data ? JSON.stringify(data) : null
          };

          await conn.execute(query, bindParams, { autoCommit: true });
          createdCount++;
          
          // Log each notification
          await this.logNotification(createdCount, userId, 'in_app', 'sent');
        }

        logger.info({ createdCount, userIds: userIds.length }, 'Broadcast notifications created');
        return createdCount;
      } catch (error) {
        logger.error({ error, userIds, title, message }, 'Failed to broadcast notifications');
        throw error;
      }
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
