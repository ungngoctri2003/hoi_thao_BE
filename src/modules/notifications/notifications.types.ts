export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'permission' | 'conference' | 'session' | 'registration' | 'general';
  is_read: boolean;
  is_archived: boolean;
  data?: any;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  title_template: string;
  message_template: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'permission' | 'conference' | 'session' | 'registration' | 'general';
  variables?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  categories?: any;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationLog {
  id: number;
  notification_id: number;
  user_id: number;
  delivery_method: 'in_app' | 'email' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error_message?: string;
  sent_at?: Date;
  delivered_at?: Date;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: number;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'system' | 'permission' | 'conference' | 'session' | 'registration' | 'general';
  data?: any;
  expires_at?: Date;
}

export interface CreateNotificationFromTemplateData {
  user_id: number;
  template_name: string;
  variables?: Record<string, any>;
  data?: any;
  expires_at?: Date;
}

export interface NotificationFilters {
  user_id?: number;
  type?: string;
  category?: string;
  is_read?: boolean;
  is_archived?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at';
  sort_order?: 'ASC' | 'DESC';
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  active_count: number;
}
