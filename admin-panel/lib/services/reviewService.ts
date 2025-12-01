import { api, ApiResponse } from '../api';

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  productName?: string;
  userName?: string;
  helpful?: number;
}

export const reviewService = {
  // Get all reviews (admin)
  getAllReviews: async (page = 1, limit = 50) => {
    return api.get<ApiResponse<Review[]>>('/reviews', { page, limit });
  },

  // Get product reviews
  getProductReviews: async (productId: number) => {
    return api.get<ApiResponse<Review[]>>(`/products/${productId}/reviews`);
  },

  // Create review
  createReview: async (data: {
    productId: number;
    userId: number;
    rating: number;
    comment: string;
  }) => {
    return api.post<ApiResponse<{ reviewId: number }>>('/reviews', data);
  },

  // Update review status
  updateReviewStatus: async (reviewId: number, status: 'approved' | 'rejected') => {
    return api.put<ApiResponse<void>>(`/reviews/${reviewId}/status`, { status });
  },

  // Delete review
  deleteReview: async (reviewId: number) => {
    return api.delete<ApiResponse<void>>(`/reviews/${reviewId}`);
  },
};
