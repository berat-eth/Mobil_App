// TypeScript type definitions for user panel

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  role?: string;
  // Şirket bilgileri
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  tradeRegisterNumber?: string;
  website?: string;
}

export interface LoginResponse {
  success: boolean;
  data?: User;
  message?: string;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  items?: OrderItem[];
  trackingNumber?: string;
  cargoCompany?: string;
  cargoStatus?: 'preparing' | 'shipped' | 'in-transit' | 'delivered';
}

export interface OrderItem {
  quantity: number;
  price: number;
  productName?: string;
  productImage?: string;
  productId?: number;
  id?: number;
}

export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  name: string;
  price: number;
  image?: string;
  stock?: number;
  createdAt?: string;
}

export interface UserAddress {
  id: number;
  userId: number;
  addressType: 'shipping' | 'billing';
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  type?: string;
  retryable?: boolean;
}

