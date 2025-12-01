import { apiService, ApiResponse } from '../utils/api-service';

export interface InstagramStoryItem {
  id: string | number;
  username: string;
  fullName?: string;
  avatarUrl: string;
  storyPreviewUrl?: string;
  hasUnseen?: boolean;
  seen?: boolean;
  timestamp?: string;
}

export class InstagramStoryService {
  static async getStories(limit: number = 20, username: string = 'hugluoutdoor'): Promise<InstagramStoryItem[]> {
    try {
      const query = `?username=${encodeURIComponent(username)}&limit=${limit}`;
      const res: ApiResponse<InstagramStoryItem[]> = await apiService.get(`/social/instagram/stories${query}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data as InstagramStoryItem[];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  static async markStorySeen(storyId: string | number): Promise<boolean> {
    try {
      const res: ApiResponse<{ success: boolean }> = await apiService.post(`/social/instagram/stories/${storyId}/seen`);
      return Boolean(res && res.success);
    } catch {
      return false;
    }
  }
}

export default InstagramStoryService;


