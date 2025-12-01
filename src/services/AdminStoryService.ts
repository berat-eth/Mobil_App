import { apiService, ApiResponse } from '../utils/api-service';

export interface AdminStoryItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
}

export interface CreateStoryData {
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isActive?: boolean;
  order?: number;
  expiresAt?: string;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
}

export class AdminStoryService {
  static async getStories(limit: number = 20): Promise<AdminStoryItem[]> {
    try {
      const query = `?limit=${limit}`;
      console.log('Story API çağrısı:', `/stories${query}`);
      const res: ApiResponse<AdminStoryItem[]> = await apiService.get(`/stories${query}`);
      console.log('Story API yanıtı:', res);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data as AdminStoryItem[];
      }
      return [];
    } catch (error) {
      console.error('Admin story yükleme hatası:', error);
      return [];
    }
  }

  static async getAllStories(limit: number = 50): Promise<AdminStoryItem[]> {
    try {
      const query = `?limit=${limit}`;
      const res: ApiResponse<AdminStoryItem[]> = await apiService.get(`/admin/stories/all${query}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data as AdminStoryItem[];
      }
      return [];
    } catch (error) {
      console.error('Tüm admin story yükleme hatası:', error);
      return [];
    }
  }

  static async createStory(storyData: CreateStoryData): Promise<AdminStoryItem | null> {
    try {
      const res: ApiResponse<AdminStoryItem> = await apiService.post('/admin/stories', storyData);
      if (res && res.success && res.data) {
        return res.data as AdminStoryItem;
      }
      return null;
    } catch (error) {
      console.error('Story oluşturma hatası:', error);
      return null;
    }
  }

  static async updateStory(storyId: string | number, storyData: Partial<CreateStoryData>): Promise<boolean> {
    try {
      const res: ApiResponse<{ success: boolean }> = await apiService.put(`/admin/stories/${storyId}`, storyData);
      return Boolean(res && res.success);
    } catch (error) {
      console.error('Story güncelleme hatası:', error);
      return false;
    }
  }

  static async deleteStory(storyId: string | number): Promise<boolean> {
    try {
      const res: ApiResponse<{ success: boolean }> = await apiService.delete(`/admin/stories/${storyId}`);
      return Boolean(res && res.success);
    } catch (error) {
      console.error('Story silme hatası:', error);
      return false;
    }
  }

  static async toggleStoryStatus(storyId: string | number): Promise<boolean> {
    try {
      const res: ApiResponse<{ success: boolean }> = await apiService.patch(`/admin/stories/${storyId}/toggle`);
      return Boolean(res && res.success);
    } catch (error) {
      console.error('Story durum değiştirme hatası:', error);
      return false;
    }
  }

  static async reorderStories(storyIds: (string | number)[]): Promise<boolean> {
    try {
      const res: ApiResponse<{ success: boolean }> = await apiService.patch('/admin/stories/reorder', { storyIds });
      return Boolean(res && res.success);
    } catch (error) {
      console.error('Story sıralama hatası:', error);
      return false;
    }
  }
}

export default AdminStoryService;
