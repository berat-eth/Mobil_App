import { apiService, ApiResponse } from '../utils/api-service';

export interface AdminSliderItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  order: number;
  autoPlay: boolean;
  duration: number;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
  buttonText?: string;
  buttonColor?: string;
  textColor?: string;
  overlayOpacity?: number;
  views?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export class AdminSliderService {
  static async getSliders(limit: number = 20): Promise<AdminSliderItem[]> {
    try {
      const query = `?limit=${limit}`;
      const res: ApiResponse<AdminSliderItem[]> = await apiService.get(`/sliders${query}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data as AdminSliderItem[];
      }
      return [];
    } catch (error) {
      console.error('Admin slider yükleme hatası:', error);
      return [];
    }
  }
}

export default AdminSliderService;

