import { api, ApiResponse, Product } from '../api';

export const productService = {
  // Get categories (string[])
  getCategories: async () => {
    return api.get<ApiResponse<string[]>>('/categories');
  },
  // Get products with pagination
  getProducts: async (page = 1, limit = 20) => {
    return api.get<ApiResponse<{ products: Product[]; total: number; hasMore: boolean }>>(
      '/products',
      { page, limit }
    );
  },

  // Search products
  searchProducts: async (query: string, page = 1, limit = 50) => {
    return api.get<ApiResponse<Product[]>>('/products/search', { q: query, page, limit });
  },

  // Get product by ID
  getProductById: async (productId: number) => {
    return api.get<ApiResponse<Product>>(`/products/${productId}`);
  },

  // Get products by category
  getProductsByCategory: async (category: string, page = 1, limit = 40) => {
    return api.get<ApiResponse<{ products: Product[]; total: number; hasMore: boolean }>>(
      `/products/category/${category}`,
      { page, limit }
    );
  },

  // Get product variations
  getProductVariations: async (productId: number) => {
    return api.get<ApiResponse<{ variations: any[]; sizeStocks?: Record<string, number> }>>(`/products/${productId}/variations`);
  },

  // Filter products
  filterProducts: async (filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
    search?: string;
  }) => {
    return api.post<ApiResponse<Product[]>>('/products/filter', filters);
  },

  // Get price range
  getPriceRange: async () => {
    return api.get<ApiResponse<{ min: number; max: number }>>('/products/price-range');
  },

  // Get lowest stock products
  getLowStockProducts: async (limit = 20, category?: string) => {
    const params: Record<string, string | number> = { limit };
    if (category) params.category = category;
    return api.get<ApiResponse<Array<{ id: number; name: string; sku?: string; stock: number; image?: string; category?: string }>>>('/products/low-stock', params);
  },

  // Notify production need with quantities per size/variant
  notifyProductionNeed: async (payload: {
    productId: number;
    notes?: string;
    variants: Array<{ size?: string; quantity: number }>;
  }) => {
    return api.post<ApiResponse<{ success: boolean }>>('/production/notify', payload);
  },

  // Update product
  updateProduct: async (productId: number, data: Partial<Product>) => {
    return api.put<ApiResponse<Product>>(`/admin/products/${productId}`, data);
  },

  // Toggle product status (active/inactive)
  toggleProductStatus: async (productId: number, isActive: boolean) => {
    return api.patch<ApiResponse<{ success: boolean; isActive: boolean }>>(`/admin/products/${productId}/status`, { isActive });
  },

  // Delete product
  deleteProduct: async (productId: number) => {
    return api.delete<ApiResponse<{ success: boolean }>>(`/admin/products/${productId}`);
  },

  // Bulk update products
  bulkUpdateProducts: async (productIds: number[], updates: Partial<Product>) => {
    return api.patch<ApiResponse<{ success: boolean; updatedCount: number }>>('/admin/products/bulk', {
      productIds,
      updates
    });
  },

  // Bulk toggle product status
  bulkToggleStatus: async (productIds: number[], isActive: boolean) => {
    return api.patch<ApiResponse<{ success: boolean; updatedCount: number }>>('/admin/products/bulk-status', {
      productIds,
      isActive
    });
  },
};
