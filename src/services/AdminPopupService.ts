import { apiService, ApiResponse } from '../utils/api-service';

export interface AdminPopupItem {
  id: string | number;
  title: string;
  content?: string;
  imageUrl?: string;
  type: 'modal' | 'banner' | 'toast' | 'slide-in';
  position: 'center' | 'top' | 'bottom' | 'top-right' | 'bottom-right';
  isActive: boolean;
  isDismissible: boolean;
  isRequired: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  targetAudience?: any;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
  buttonText?: string;
  buttonColor?: string;
  backgroundColor?: string;
  textColor?: string;
  width?: string;
  height?: string;
  autoClose?: number;
  showDelay?: number;
  views?: number;
  clicks?: number;
  dismissals?: number;
  createdAt: string;
  updatedAt: string;
}

export class AdminPopupService {
  static async getPopups(): Promise<AdminPopupItem[]> {
    try {
      const res: ApiResponse<AdminPopupItem[]> = await apiService.get('/popups');
      if (res && res.success && Array.isArray(res.data)) {
        // Tarih kontrolü - sadece aktif ve geçerli tarih aralığındaki popup'ları döndür
        const now = new Date();
        return res.data.filter(popup => {
          if (!popup.isActive) return false;
          if (popup.startDate && new Date(popup.startDate) > now) return false;
          if (popup.endDate && new Date(popup.endDate) < now) return false;
          return true;
        }) as AdminPopupItem[];
      }
      return [];
    } catch (error) {
      console.error('Admin popup yükleme hatası:', error);
      return [];
    }
  }

  static async trackPopupView(popupId: string | number): Promise<void> {
    try {
      await apiService.post(`/popups/${popupId}/stats`, { action: 'view' });
    } catch (error) {
      console.error('Popup view tracking hatası:', error);
    }
  }

  static async trackPopupClick(popupId: string | number): Promise<void> {
    try {
      await apiService.post(`/popups/${popupId}/stats`, { action: 'click' });
    } catch (error) {
      console.error('Popup click tracking hatası:', error);
    }
  }

  static async trackPopupDismissal(popupId: string | number): Promise<void> {
    try {
      await apiService.post(`/popups/${popupId}/stats`, { action: 'dismissal' });
    } catch (error) {
      console.error('Popup dismissal tracking hatası:', error);
    }
  }
}

export default AdminPopupService;

