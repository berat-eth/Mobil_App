// API Configuration and Utilities
// UZAK SUNUCU ZORUNLU: Tüm istekler remote base URL'ye gider
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';

// Hassas bilgi alanları - loglanmamalı
const SENSITIVE_FIELDS = [
  'password', 'token', 'authToken', 'apiKey', 'adminKey', 'secret',
  'authorization', 'x-api-key', 'x-admin-key', 'csrf-token',
  'creditCard', 'cvv', 'ssn', 'socialSecurityNumber',
  'accessToken', 'refreshToken', 'bearer', 'jwt'
];

// Token pattern'leri - bu pattern'leri içeren değerler filtrelenmeli
const TOKEN_PATTERNS = [
  /token/i,
  /auth/i,
  /key/i,
  /secret/i,
  /password/i,
  /bearer/i,
  /jwt/i,
  /huglu-admin/i, // Özel admin token pattern'i
  /admin-token/i
];

/**
 * Hassas bilgileri objeden temizle (recursive)
 */
function sanitizeSensitiveData(obj: any, depth = 0): any {
  // Maksimum derinlik kontrolü (DoS koruması)
  if (depth > 10) return '[Max depth reached]';
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // String değerlerde token pattern'leri kontrol et
  if (typeof obj === 'string') {
    // Token pattern'leri içeren string'leri filtrele
    if (TOKEN_PATTERNS.some(pattern => pattern.test(obj)) && obj.length > 5) {
      return '[REDACTED]';
    }
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveData(item, depth + 1));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Hassas alan kontrolü - key'de hassas kelime varsa
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } 
    // Value string ise ve token pattern içeriyorsa
    else if (typeof value === 'string' && TOKEN_PATTERNS.some(pattern => pattern.test(value)) && value.length > 5) {
      sanitized[key] = '[REDACTED]';
    }
    // Value object ise recursive olarak temizle
    else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeSensitiveData(value, depth + 1);
    } 
    // Diğer durumlarda olduğu gibi bırak
    else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private adminKey: string;

  constructor(baseUrl: string, apiKey: string, adminKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.adminKey = adminKey;
  }

  private getHeaders(endpoint: string, customHeaders?: HeadersInit, method?: string): HeadersInit {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      base['X-API-Key'] = this.apiKey;
    }
    
    // Admin endpoint'leri için admin key ekle
    // /admin/ veya /dealership/ (admin panelinde kullanılan) endpoint'leri için
    if (endpoint.startsWith('/admin/') || endpoint.startsWith('/dealership/')) {
      base['X-Admin-Key'] = this.adminKey;
    }
    
    // İstemci tarafında mevcutsa auth token'ı ekle
    try {
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('authToken') || '';
        if (token) base['Authorization'] = `Bearer ${token}`;
        
        // State-changing method'lar için CSRF token ekle
        if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
          const { getCSRFHeader } = require('./csrf');
          const csrfHeaders = getCSRFHeader();
          Object.assign(base, csrfHeaders);
        }
      }
    } catch {}
    return {
      ...base,
      ...customHeaders,
    };
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { params, headers, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const method = fetchOptions.method || 'GET';

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers: this.getHeaders(endpoint, headers, method),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // JSON parse hatası, status text kullan
          errorMessage = response.statusText || errorMessage;
        }
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      try {
        // Hassas bilgileri filtrele
        let requestBody: any = undefined;
        if (fetchOptions.body) {
          try {
            const parsed = JSON.parse(String(fetchOptions.body));
            requestBody = sanitizeSensitiveData(parsed);
          } catch {
            requestBody = '[Non-JSON body]';
          }
        }
        
        const logEntry = {
          method,
          url: url.replace(/\/\/[^\/]+@/, '//***@'), // URL'deki credentials'ı gizle
          status: response.status,
          ok: response.ok,
          time: new Date().toISOString(),
          requestBody,
          responseBody: sanitizeSensitiveData(data)
        };
        if (typeof window !== 'undefined') {
          const logs = JSON.parse(localStorage.getItem('apiLogs') || '[]');
          logs.unshift(logEntry);
          localStorage.setItem('apiLogs', JSON.stringify(logs.slice(0, 200)));
          window.dispatchEvent(new CustomEvent('api-log-updated'));
        }
      } catch {}
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // "Failed to fetch" hatasını Türkçeleştir
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const turkishError = new Error('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.');
        (turkishError as any).status = 0;
        (turkishError as any).originalError = error;
        throw turkishError;
      }
      
      // Network hatalarını Türkçeleştir
      if (error instanceof TypeError && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('NetworkError')
      )) {
        const turkishError = new Error('Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.');
        (turkishError as any).status = 0;
        (turkishError as any).originalError = error;
        throw turkishError;
      }
      
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL, API_KEY, ADMIN_KEY);

/**
 * Hata mesajını Türkçeleştir
 */
export function translateError(error: any): string {
  if (!error) return 'Bilinmeyen hata';
  
  const errorMessage = error.message || String(error);
  
  // "Failed to fetch" hatasını Türkçeleştir
  if (errorMessage === 'Failed to fetch' || errorMessage.includes('Failed to fetch')) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';
  }
  
  // Network hatalarını Türkçeleştir
  if (errorMessage.includes('fetch') || 
      errorMessage.includes('network') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Network request failed')) {
    return 'Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.';
  }
  
  // TypeError network hataları
  if (error instanceof TypeError && (
    errorMessage.includes('fetch') || 
    errorMessage.includes('network')
  )) {
    return 'Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.';
  }
  
  return errorMessage;
}

// Type definitions
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  brand: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  sku?: string;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  shippingAddress?: string;
  paymentMethod?: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  items: OrderItem[];
  // Optional fields used by UI
  customer?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;
  date?: string;
  payment?: string;
  total?: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  taxNumber?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  cargoStatus?: 'preparing' | 'shipped' | 'in-transit' | 'delivered';
}

export interface OrderItem {
  quantity: number;
  price: number;
  productName: string;
  productImage: string;
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  variationString?: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
}
