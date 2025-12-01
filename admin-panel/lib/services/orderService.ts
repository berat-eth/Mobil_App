import { api, ApiResponse, Order } from '../api';

export interface CreateOrderData {
  userId: number;
  totalAmount: number;
  status: string;
  shippingAddress: string;
  paymentMethod: string;
  city: string;
  district: string;
  fullAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
    productName: string;
    productDescription?: string;
    productCategory?: string;
    productBrand?: string;
    productImage?: string;
    variationString?: string;
    selectedVariations?: Record<string, string>;
  }>;
}

export const orderService = {
  // Create new order
  createOrder: async (data: CreateOrderData) => {
    return api.post<ApiResponse<{ orderId: number; expGained: number }>>('/orders', data);
  },

  // Get user orders
  getUserOrders: async (userId: number) => {
    return api.get<ApiResponse<Order[]>>(`/orders/user/${userId}`);
  },

  // Update order status
  updateOrderStatus: async (orderId: number, status: string) => {
    return api.put<ApiResponse<void>>(`/orders/${orderId}/status`, { status });
  },

  // Cancel order
  cancelOrder: async (orderId: number) => {
    return api.put<ApiResponse<void>>(`/orders/${orderId}/cancel`);
  },

  // Get returnable orders
  getReturnableOrders: async (userId: number) => {
    return api.get<ApiResponse<any[]>>('/orders/returnable', { userId });
  },
};
