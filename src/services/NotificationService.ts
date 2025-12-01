import apiService from '../utils/api-service';
import { UserController } from '../controllers/UserController';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion' | 'order';
  isRead: boolean;
  readAt?: string;
  data?: any;
  createdAt: string;
}

class NotificationService {
  /**
   * Get user notifications
   */
  async getNotifications(limit: number = 50, offset: number = 0, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        console.log('⚠️ Bildirimler için kullanıcı ID bulunamadı');
        return [];
      }

      const response = await apiService.get<Notification[]>(
        `/notifications?userId=${userId}&limit=${limit}&offset=${offset}${unreadOnly ? '&unreadOnly=true' : ''}`
      );

      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('❌ Bildirimler yüklenirken hata:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return 0;
      }

      const response = await apiService.get<{ count: number }>(`/notifications/unread-count?userId=${userId}`);
      
      if (response && response.success && response.data) {
        return response.data.count || 0;
      }
      return 0;
    } catch (error) {
      console.error('❌ Okunmamış bildirim sayısı alınırken hata:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return false;
      }

      const response = await apiService.put(`/notifications/${notificationId}/read`, { userId });
      return response.success || false;
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenirken hata:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const userId = await UserController.getCurrentUserId();
      if (!userId) {
        return false;
      }

      const response = await apiService.put('/notifications/read-all', { userId });
      return response.success || false;
    } catch (error) {
      console.error('Tüm bildirimler okundu olarak işaretlenirken hata:', error);
      return false;
    }
  }
}

export default new NotificationService();
