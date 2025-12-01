import apiService from '../utils/api-service';

export class NotificationController {
  static async createSystemNotification(
    userId: number | string,
    title: string,
    message: string
  ): Promise<{ success: boolean; notificationId?: string | number; message?: string }> {
    try {
      const payload = {
        userId: String(userId),
        title,
        message,
        type: 'system',
        source: 'mobile-app',
      };
      const res = await apiService.post('/notifications/system', payload);
      if (res?.success) {
        const id = (res as any)?.data?.id ?? (res as any)?.notificationId;
        return { success: true, notificationId: id };
      }
      return { success: false, message: res?.message || 'Bildirim oluşturulamadı' };
    } catch (error) {
      return { success: false, message: 'Bildirim isteği sırasında hata oluştu' };
    }
  }
}

export default NotificationController;


