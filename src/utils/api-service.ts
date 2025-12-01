import { getApiBaseUrl, detectBestServer, REMOTE_SERVERS, IP_SERVER_CANDIDATES, DEFAULT_TENANT_API_KEY, SINGLE_TENANT, DEFAULT_TENANT_ID } from './api-config';
import { CacheService } from '../services/CacheService';
import { Linking } from 'react-native';
import { getApiKey as getStoredApiKey, getTenantId as getStoredTenantId } from '../services/AuthKeyStore';

// Dynamic API base URL - will be set based on network detection
let currentApiUrl = getApiBaseUrl();
// ✅ OPTIMIZASYON: Cache durations - optimize edilmiş cache stratejisi
const CACHE_DURATION = 15 * 60 * 1000; // 15 dakika - genel cache (10 → 15)
const PRODUCT_CACHE_DURATION = 30 * 60 * 1000; // 30 dakika - ürünler için (20 → 30)
const SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 2 dakika - arama sonuçları için
const CATEGORY_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 saat - kategoriler için (1 → 2 saat)
const STATIC_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 saat - statik içerik (2 → 4 saat)
const OFFLINE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat offline cache

// Offline özellikleri devre dışı: her zaman ağ üzerinden dene
const isNetworkAvailable = (): boolean => true;

// Enhanced cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  isOffline: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  isOffline?: boolean;
  retryCount?: number;
}

// Enhanced error types
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  code?: number;
  retryable: boolean;
}

class ApiService {
  private cache = new Map<string, CacheItem<any>>();

  // No encryption needed - data sent as plain text
  private encryptSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const masked = { ...data } as any;
    if (masked.cardNumber) {
      const raw = String(masked.cardNumber).replace(/\s/g, '');
      masked.cardNumber = raw.replace(/(\d{4})\d+(\d{4})/, '$1********$2');
    }
    if (masked.cvv) masked.cvv = '***';
    if (masked.cvc) masked.cvc = '***';
    return masked;
  }

  // No decryption needed - data received as plain text
  private decryptSensitiveData(data: any): any {
    return data;
  }
  private offlineQueue: Array<{ endpoint: string; method: string; body?: any; timestamp: number }> = [];
  private isOnline = true;
  private retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff delays with more attempts
  private networkMonitoringInterval: NodeJS.Timeout | null = null;
  private lastOnlineCheck: number | null = null;
  private consecutiveFailures: number = 0;
  private apiKey: string | null = null;
  private alternativeUrls: string[] = []; // Alternative URLs to try
  private currentUrlIndex: number = 0;
  
  // ✅ OPTIMIZASYON: Request deduplication - aynı endpoint'e aynı anda birden fazla istek gitmesini engelle
  private pendingRequests = new Map<string, Promise<ApiResponse<any>>>();

  // API Key management
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // API Key set successfully
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey(): void {
    this.apiKey = null;
    // API Key cleared
  }

  // Network auto-detection methods with remote server support
  private async detectNetworkUrls(): Promise<string[]> {
    const urls: string[] = [];

    // Domain candidate
    urls.push('https://api.huglutekstil.com/api');

    // IP-based candidates (for both development and production)
    (IP_SERVER_CANDIDATES || []).forEach(ip => {
      urls.push(`https://${ip}/api`);
      // Only add HTTP in development
      if (__DEV__) {
        urls.push(`http://${ip}/api`);
      }
    });

    return urls;
  }

  private async testUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      // Yerel adresler zaten oluşturulmuyor; yine de güvenlik için engelle
      if (/localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\./.test(url)) {
        clearTimeout(timeoutId);
        return false;
      }

      const response = await fetch(`${url.replace(/\/$/, '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Huglu-Mobile-App/1.0 ReactNative',
          'X-Client-Type': 'mobile'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // URL test failed - silent
      return false;
    }
  }

  async autoDetectApiUrl(): Promise<string> {
    // Auto-detecting API URL

    // First try current URL if it is not a localhost/LAN address
    // (silindi)

    // Generate alternative URLs
    const urls = await this.detectNetworkUrls();

    // Test URLs in parallel (but limit concurrent requests)
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const promises = batch.map(async (url) => {
        const isWorking = await this.testUrl(url);
        return { url, isWorking };
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.isWorking) {
          // Found working API URL
          currentApiUrl = result.url;
          return result.url;
        }
      }
    }

    // No working remote API URL found, keeping current
    return currentApiUrl;
  }

  setApiUrl(url: string): void {
    currentApiUrl = url;
    // API URL set
  }

  getCurrentApiUrl(): string {
    return currentApiUrl;
  }

  // Enhanced cache helper methods
  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params || {})}`;
  }

  private isCacheValid(timestamp: number, isOffline: boolean): boolean {
    const duration = isOffline ? OFFLINE_CACHE_DURATION : CACHE_DURATION;
    return Date.now() - timestamp < duration;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await CacheService.get<T>(key);
      return cached as any;
    } catch {
      return null;
    }
  }

  private async setCache<T>(key: string, data: T, isOffline: boolean = false): Promise<void> {
    try {
      const ttl = isOffline ? OFFLINE_CACHE_DURATION : CACHE_DURATION;
      await CacheService.set<T>(key, data, ttl);
    } catch { }
  }

  // Enhanced error handling
  private createApiError(error: any, endpoint: string): ApiError {
    const messageText = String(error?.message || '').toLowerCase();

    if (messageText.includes('timeout') || error.name === 'AbortError') {
      return {
        type: ApiErrorType.TIMEOUT_ERROR,
        message: 'İstek zaman aşımına uğradı',
        retryable: true
      };
    }

    if (messageText.includes('failed to fetch') ||
      messageText.includes('network request failed') ||
      messageText.includes('network')) {
      return {
        type: ApiErrorType.NETWORK_ERROR,
        message: 'Ağ bağlantısı hatası',
        retryable: true
      };
    }

    if (error.status === 401) {
      return {
        type: ApiErrorType.UNAUTHORIZED_ERROR,
        message: 'Yetkilendirme hatası',
        code: 401,
        retryable: false
      };
    }

    if (error.status === 404) {
      return {
        type: ApiErrorType.NOT_FOUND_ERROR,
        message: 'Kaynak bulunamadı',
        code: 404,
        retryable: false
      };
    }

    if (error.status >= 500) {
      return {
        type: ApiErrorType.SERVER_ERROR,
        message: 'Sunucu hatası',
        code: error.status,
        retryable: true
      };
    }

    return {
      type: ApiErrorType.UNKNOWN_ERROR,
      message: error.message || 'Bilinmeyen hata',
      retryable: false
    };
  }

  // Enhanced request method with better error handling
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    retryCount: number = 0,
    isOfflineRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    // ✅ OPTIMIZASYON: Retry stratejisi - endpoint'e göre belirle
    const isCartOperation = endpoint.includes('/cart');
    const isCriticalOperation = endpoint.includes('/orders') || endpoint.includes('/payments');
    const TIMEOUT_MS = 10000; // Varsayılan timeout (executeRequest içinde dinamik olarak ayarlanacak)
    const MAX_RETRIES = isCartOperation ? 0 : (isCriticalOperation ? 2 : 1); // Kritik işlemler: 2 retry, Sepet: retry yok

    // ✅ OPTIMIZASYON: Request deduplication - GET istekleri için aynı anda tekrarlayan istekleri birleştir
    const requestKey = `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
    
    // POST/PUT/DELETE istekleri için deduplication yapma (idempotent değil)
    // Sadece GET istekleri için deduplication yap
    if (method === 'GET' && this.pendingRequests.has(requestKey)) {
      const pendingRequest = this.pendingRequests.get(requestKey)!;
      return pendingRequest as Promise<ApiResponse<T>>;
    }

    // Network availability check
    // Offline modu devre dışı; ağ yoksa hata akışına düşecek

    // Yeni isteği başlat ve pendingRequests'e ekle
    const requestPromise = this.executeRequest<T>(endpoint, method, body, retryCount, isOfflineRetry, TIMEOUT_MS, MAX_RETRIES, startTime);
    
    // GET istekleri için deduplication yap
    if (method === 'GET') {
      this.pendingRequests.set(requestKey, requestPromise);
      requestPromise.finally(() => {
        // İstek tamamlandığında pendingRequests'ten kaldır
        this.pendingRequests.delete(requestKey);
      });
    }
    
    return requestPromise;
  }

  // ✅ OPTIMIZASYON: Request execution'ı ayrı metoda taşıdık
  private async executeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: any,
    retryCount: number,
    isOfflineRetry: boolean,
    TIMEOUT_MS: number,
    MAX_RETRIES: number,
    startTime: number
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}${endpoint}`;
      if (endpoint.includes('flash-deals')) {
        console.log('🌐 [api-service] Flash deals request:', {
          baseUrl,
          endpoint,
          fullUrl: url,
          method
        });
      }
      if (endpoint.includes('/products/') && !endpoint.includes('/products?')) {
        // Ürün detay endpoint'i için log
        const productId = endpoint.match(/\/products\/(\d+)/)?.[1];
        console.log('🌐 [api-service] Product detail request:', {
          productId,
          baseUrl,
          endpoint,
          fullUrl: url,
          method
        });
      }
      
      // ✅ OPTIMIZASYON: Endpoint'e göre dinamik timeout belirleme
      let dynamicTimeout = TIMEOUT_MS;
      if (endpoint.includes('/ollama/generate')) {
        // Ollama istekleri: çok uzun sürebilir (model yükleme, büyük yanıtlar)
        dynamicTimeout = 120000; // 2 dakika (120 saniye)
      } else if (endpoint.includes('/cart')) {
        // Sepet işlemleri: hızlı olmalı (kullanıcı etkileşimi)
        dynamicTimeout = 5000;
      } else if (endpoint.includes('/products/search') || endpoint.includes('/products/filter')) {
        // Arama/filtreleme: orta hız (kullanıcı bekleyebilir)
        dynamicTimeout = 8000;
      } else if (endpoint.includes('/homepage-products') || endpoint.includes('/products')) {
        // Ürün listeleri: biraz daha uzun (çok veri çekiliyor)
        dynamicTimeout = 12000;
      } else if (endpoint.includes('/categories') || endpoint.includes('/brands') || endpoint.includes('/slider')) {
        // Statik içerik: daha uzun timeout (nadiren değişir, cache'lenebilir)
        dynamicTimeout = 15000;
      }
      // Diğer endpointler için varsayılan TIMEOUT_MS kullanılır

      // API Request

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'User-Agent': 'Huglu-Mobile-App/1.0 ReactNative',
        'X-Client-Type': 'mobile',
        'Accept': 'application/json',
        // ✅ FIX: React Native Brotli (br) desteklemiyor, sadece gzip/deflate kullan
        'Accept-Encoding': 'gzip, deflate', // Brotli kaldırıldı - React Native uyumluluğu için
        // Tenant header dinamik
        'X-Tenant-Id': '1'
      };

      let apiKeyToUse: string | null = null;
      let tenantIdToUse: string | null = null;

      if (SINGLE_TENANT) {
        apiKeyToUse = DEFAULT_TENANT_API_KEY || null;
        tenantIdToUse = DEFAULT_TENANT_ID || null;
      }

      // Her iki modda da depodan okunan değerleri tercih et
      try {
        const [storedKey, storedTenant] = await Promise.all([
          getStoredApiKey(),
          getStoredTenantId()
        ]);
        if (storedKey) apiKeyToUse = storedKey;
        if (storedTenant) tenantIdToUse = storedTenant;
      } catch { }

      // Runtime'da set edilen API anahtarı öncelikli olsun
      if (this.apiKey) {
        apiKeyToUse = this.apiKey;
      }

      if (tenantIdToUse) {
        (headers as any)['X-Tenant-Id'] = tenantIdToUse;
        (headers as any)['x-tenant-id'] = tenantIdToUse;
      }

      if (apiKeyToUse) {
        (headers as any)['X-API-Key'] = apiKeyToUse;
        (headers as any)['Authorization'] = `Bearer ${apiKeyToUse}`;
      }

      // Backward compatibility: some endpoints read lowercase header name
      if ((headers as any)['X-Tenant-Id']) {
        (headers as any)['x-tenant-id'] = (headers as any)['X-Tenant-Id'];
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        // Hassas verileri şifrele (POST/PUT istekleri için)
        const encryptedBody = this.encryptSensitiveData(body);
        config.body = JSON.stringify(encryptedBody);
        // Request body encrypted for sensitive data
      }

      // ✅ OPTIMIZASYON: Dinamik timeout kullan
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, dynamicTimeout);

      // Add abort signal to config
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Product endpoint için log
      if (endpoint.includes('/products/') && !endpoint.includes('/products?')) {
        const productId = endpoint.match(/\/products\/(\d+)/)?.[1];
        console.log(`📡 [api-service] Product ${productId} response:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: url
        });
      }
      
      if (endpoint.includes('flash-deals')) {
        // ✅ FIX: React Native'de Headers.entries() desteklenmiyor, manuel dönüştürme
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value: string, key: string) => {
          headersObj[key] = value;
        });
        console.log('📡 [api-service] Flash deals response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: headersObj
        });
      }
      // Response received

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      const contentEncoding = response.headers.get('content-encoding');
      let result;

      // Content-Encoding kontrolü - sıkıştırılmış response uyarısı
      if (contentEncoding && contentEncoding.includes('br')) {
        console.warn('⚠️ [api-service] Response is Brotli compressed - React Native may not decode it properly. Consider disabling Brotli on server.');
      }

      if (contentType && contentType.includes('application/json')) {
        // Response'u önce clone et ki hata durumunda tekrar okuyabilelim
        const clonedResponse = response.clone();
        try {
          // ✅ FIX: React Native fetch otomatik olarak gzip/deflate decode eder
          // Ama eğer Brotli (br) gelirse decode edemez
          const text = await response.text();
          
          // Eğer text binary görünüyorsa (sıkıştırılmış ama decode edilmemiş), hata ver
          if (text && text.length > 0) {
            const firstChar = text.charCodeAt(0);
            const isBinary = (firstChar < 32 || firstChar > 126) && !text.trim().startsWith('{') && !text.trim().startsWith('[');
            if (isBinary && contentEncoding) {
              console.error('❌ [api-service] Response appears to be compressed but not decoded:', {
                contentEncoding,
                firstChar,
                textPreview: text.substring(0, 100)
              });
              result = {
                success: false,
                message: 'Compressed response could not be decoded. Server may be using Brotli compression which React Native does not support.',
                error: 'DECOMPRESSION_ERROR',
                contentEncoding
              };
            } else if (!text || text.trim() === '') {
              result = {
                success: false,
                message: 'Empty response from server',
                error: 'EMPTY_RESPONSE'
              };
            } else {
              result = JSON.parse(text);
            }
          } else {
            result = {
              success: false,
              message: 'Empty response from server',
              error: 'EMPTY_RESPONSE'
            };
          }
        } catch (jsonError: any) {
          console.error('❌ JSON parse error:', jsonError);
          // Response text'ini al ve logla (clone'dan)
          try {
            const text = await clonedResponse.text();
            // Sadece ilk 200 karakteri göster (binary data çok uzun olabilir)
            const preview = text.length > 200 ? text.substring(0, 200) : text;
            console.error('❌ Response text preview:', preview);
            console.error('❌ Response encoding:', contentEncoding);
          } catch (e) {
            console.error('❌ Could not read response text:', e);
          }
          result = {
            success: false,
            message: 'Invalid JSON response from server',
            error: 'JSON_PARSE_ERROR',
            parseError: jsonError?.message || String(jsonError),
            contentEncoding
          };
        }
      } else {
        // If not JSON, get text and try to parse as JSON
        const text = await response.text();
        // Non-JSON response received - handle gracefully

        if (!text || text === 'undefined' || text.trim() === '') {
          result = {
            success: false,
            message: 'Empty response from server',
            error: 'EMPTY_RESPONSE'
          };
        } else {
          const trimmed = text.trim();
          // If looks like HTML or plain text, don't attempt JSON parse
          if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('</')) {
            result = {
              success: false,
              message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
              error: trimmed.substring(0, 500)
            };
          } else {
            // Check if text looks like JSON before attempting to parse
            const firstChar = trimmed.charAt(0);
            const looksLikeJson = firstChar === '{' || firstChar === '[' || 
                                 firstChar === '"' || 
                                 trimmed === 'true' || trimmed === 'false' || trimmed === 'null' ||
                                 /^-?\d/.test(trimmed);
            
            if (looksLikeJson) {
              try {
                result = JSON.parse(text);
              } catch (parseError) {
                // Silently handle parse errors - response is not valid JSON
                result = {
                  success: false,
                  message: `Server returned invalid JSON: ${response.status} ${response.statusText}`,
                  error: trimmed.substring(0, 200)
                };
              }
            } else {
              // Text doesn't look like JSON, don't attempt to parse
              result = {
                success: false,
                message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
                error: trimmed.substring(0, 200)
              };
            }
          }
        }
      }

      const duration = Date.now() - startTime;


      // Performance logging
      if (duration > 1000) {
        // Slow API call - silent
      } else {
        // API call completed
      }

      // Product endpoint için 404/401 hatalarını detaylı logla
      if (endpoint.includes('/products/') && !endpoint.includes('/products?') && !response.ok) {
        const productId = endpoint.match(/\/products\/(\d+)/)?.[1];
        console.error(`❌ [api-service] Product ${productId} request failed:`, {
          status: response.status,
          statusText: response.statusText,
          url: url,
          result: result,
          error: result?.error,
          message: result?.message
        });
      }
      
      if (!response.ok) {
        const status = response.status;
        // 502/503/504 durumlarında otomatik kısa gecikmeli yeniden dene
        if ([502, 503, 504].includes(status) && retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
          return this.request(endpoint, method, body, retryCount + 1, isOfflineRetry);
        }
        const apiError = this.createApiError({ status, message: result?.message }, endpoint);
        return {
          success: false,
          message: result?.message || response.statusText || 'Request failed',
          error: result?.error || String(status),
        } as any;
      }

      // Server'dan gelen hassas verileri şifre çöz
      if (result.success && result.data) {
        result.data = this.decryptSensitiveData(result.data);
        // Response data decrypted for sensitive fields
      }

      // ✅ OPTIMIZASYON: Cache successful responses with appropriate TTL
      // Cart endpoint'leri cache'lenmez
      if (method === 'GET' && result.success && !endpoint.includes('/cart')) {
        const cacheKey = this.getCacheKey(endpoint);
        let ttl = CACHE_DURATION;
        
        // Endpoint'e göre cache süresi belirle
        if (endpoint.includes('/products/search')) {
          ttl = SEARCH_CACHE_DURATION;
        } else if (endpoint.includes('/products') && !endpoint.includes('/search')) {
          ttl = PRODUCT_CACHE_DURATION;
        } else if (endpoint.includes('/categories') || endpoint.includes('/brands')) {
          ttl = CATEGORY_CACHE_DURATION;
        } else if (endpoint.includes('/slider') || endpoint.includes('/homepage-products')) {
          ttl = STATIC_CACHE_DURATION;
        }
        
        await CacheService.set(cacheKey, result, ttl);
      }

      this.isOnline = true;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures = 0;
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Enhanced retry logic with better offline detection
      if (retryCount < MAX_RETRIES && this.shouldRetry(error)) {
        const delay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
        // Retrying request - silent

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.request(endpoint, method, body, retryCount + 1, isOfflineRetry);
      }

      // Try auto-detection if we haven't tried it yet for this request
      if (retryCount === 0 && this.isOfflineRequest(error)) {
        // Attempting API URL auto-detection
        try {
          const newUrl = await this.autoDetectApiUrl();
          if (newUrl !== currentApiUrl) {
            // Retrying with new URL
            return this.request(endpoint, method, body, retryCount + 1, isOfflineRetry);
          }
        } catch (detectionError) {
          // Auto-detection failed - silent
        }
      }

      // Offline geri dönüş devre dışı

      const apiError = this.createApiError(error, endpoint);
      console.error(`❌ API request failed: ${endpoint} (${duration}ms)`, apiError);

      // Global API durumu güncelle - bağlantı hatası varsa
      if (this.isOfflineRequest(error) || (error as any)?.status >= 500) {
        // BackendErrorService ile hemen hata göster
        const { BackendErrorService } = require('../services/BackendErrorService');
        BackendErrorService.handleBackendError(() => {
          return this.request(endpoint, method, body, 0, false);
        });
      }

      // Check if this is a backend connection error
      const { BackendErrorService } = require('../services/BackendErrorService');
      if (BackendErrorService.isBackendConnectionError(error, endpoint)) {
        // Backend connection error detected - silent
        BackendErrorService.handleBackendError(() => {
          // Retry callback
          // Retrying failed request after error modal
          return this.request(endpoint, method, body, 0, false);
        });
      }

      this.isOnline = false;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures++;
      return {
        success: false,
        message: apiError.message,
        error: apiError.message,
        isOffline: true,
        retryCount
      };
    }
  }

  // Check if error should trigger retry
  private shouldRetry(error: any): boolean {
    if (error.type) {
      console.log(`🔄 Retry check: ${error.retryable ? 'YES' : 'NO'} - ${error.type} - ${error.message || 'No message'}`);
      return error.retryable;
    }

    const messageText = String(error?.message || '').toLowerCase();
    const retryable = messageText.includes('timeout') ||
      error.name === 'AbortError' ||
      messageText.includes('network request failed') ||
      messageText.includes('network') ||
      messageText.includes('fetch') ||
      messageText.includes('failed to fetch') ||
      messageText.includes('sunucu hatası') ||
      messageText.includes('server error');

    console.log(`🔄 Retry check: ${retryable ? 'YES' : 'NO'} - ${error.name || 'UNKNOWN'} - ${messageText}`);
    return retryable;
  }

  // Check if this is an offline request
  private isOfflineRequest(error: any): boolean {
    // More aggressive offline detection
    const messageText = String(error?.message || '').toLowerCase();
    return !this.isOnline ||
      messageText.includes('timeout') ||
      error.name === 'AbortError' ||
      messageText.includes('failed to fetch') ||
      messageText.includes('network request failed') ||
      messageText.includes('network') ||
      messageText.includes('econnreset') ||
      messageText.includes('enotfound') ||
      messageText.includes('econnrefused');
  }

  // Handle offline requests with cache
  private async handleOfflineRequest<T>(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    // Offline modu devre dışı
    return {
      success: false,
      error: 'Offline mode disabled',
      isOffline: false
    } as any;
  }

  // Process offline queue when back online
  async processOfflineQueue(): Promise<void> {
    // Offline kuyruğu devre dışı
    this.offlineQueue = [];
    return;
  }

  // Enhanced user endpoints
  async createUser(userData: any): Promise<ApiResponse<{ userId: number }>> {
    return this.request('/users', 'POST', userData);
  }

  async getUserByEmail(email: string): Promise<ApiResponse<any>> {
    return this.request(`/users/email/${encodeURIComponent(email)}`);
  }

  async getUserById(id: number): Promise<ApiResponse<any>> {
    // X-Tenant-Id header zorunlu olduğu için header ekliyoruz
    return this.request(`/users/${id}`);
  }

  async updateUser(id: number, data: any): Promise<ApiResponse<boolean>> {
    return this.request(`/users/${id}`, 'PUT', data);
  }

  async updateProfile(userId: number, data: any): Promise<ApiResponse<boolean>> {
    return this.request(`/users/${userId}/profile`, 'PUT', data);
  }

  async changePassword(userId: number, data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<boolean>> {
    return this.request(`/users/${userId}/password`, 'PUT', data);
  }

  async loginUser(email: string, password: string): Promise<ApiResponse<any>> {
    return this.request('/users/login', 'POST', { email, password });
  }

  // Enhanced product endpoints with better caching and pagination
  async getAllProducts(): Promise<ApiResponse<any[]>> {
    const cacheKey = this.getCacheKey('/products');
    const cached = await this.getFromCache<ApiResponse<any[]>>(cacheKey);
    if (cached && cached.success && Array.isArray(cached.data)) {
      // SWR: önce cache dön, arkaplanda güncelle
      this.request<any[]>('/products')
        .then(async (fresh) => {
          if (fresh && fresh.success) {
            await CacheService.set(cacheKey, fresh, PRODUCT_CACHE_DURATION);
          }
        })
        .catch(() => { });
      return cached;
    }

    const result = await this.request<any[]>('/products');
    if (result.success) {
      await CacheService.set(cacheKey, result, PRODUCT_CACHE_DURATION);
    }
    return result;
  }

  // New paginated products endpoint
  async getProducts(page: number = 1, limit: number = 50, nocache: boolean = false): Promise<ApiResponse<{ products: any[], total: number, hasMore: boolean }>> {
    const cacheKey = this.getCacheKey(`/products?page=${page}&limit=${limit}`);
    
    // Cache bypass kontrolü: nocache=true ise cache'i atla
    if (!nocache) {
      const cached = await this.getFromCache<ApiResponse<{ products: any[], total: number, hasMore: boolean }>>(cacheKey);
      if (cached && cached.success && Array.isArray(cached.data?.products)) {
        // SWR cache-first - arkaplanda yenile
        this.request<{ products: any[], total: number, hasMore: boolean }>(`/products?page=${page}&limit=${limit}`)
          .then(async (fresh) => {
            if (fresh && fresh.success) {
              await CacheService.set(cacheKey, fresh, PRODUCT_CACHE_DURATION);
            }
          })
          .catch(() => { });
        return cached;
      }
    }

    // Cache bypass veya cache miss - fresh data çek
    const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (nocache) {
      queryParams.append('nocache', 'true');
    }
    const result = await this.request<{ products: any[], total: number, hasMore: boolean }>(`/products?${queryParams.toString()}`);
    if (result.success && !nocache) {
      await CacheService.set(cacheKey, result, PRODUCT_CACHE_DURATION);
    }
    return result;
  }

  async getProductById(id: number, nocache: boolean = false): Promise<ApiResponse<any>> {
    const cacheKey = this.getCacheKey(`/products/${id}`);
    
    // Cache bypass kontrolü: nocache=true ise cache'i atla
    if (!nocache) {
      const cached = await this.getFromCache<ApiResponse<any>>(cacheKey);
      // SWR: Eğer cache varsa hemen onu döndür; arkaplanda yenile
      if (cached && cached.success) {
        // Arkaplanda yenile (sessiz)
        this.request<any>(`/products/${id}`)
          .then(async (fresh) => {
            if (fresh && fresh.success) {
              await CacheService.set(cacheKey, fresh, PRODUCT_CACHE_DURATION);
            }
          })
          .catch(() => { });
        return cached;
      }
    }

    const endpoint = `/products/${id}${nocache ? '?nocache=true' : ''}`;
    console.log(`🌐 [api-service] Product request: ID=${id}, nocache=${nocache}, endpoint=${endpoint}`);
    
    const result = await this.request<any>(endpoint);
    
    if (result.success) {
      if (!nocache) {
        await CacheService.set(cacheKey, result, PRODUCT_CACHE_DURATION);
      }
      console.log(`✅ [api-service] Product ${id} fetched successfully`);
    } else {
      console.error(`❌ [api-service] Product ${id} fetch failed:`, {
        success: result.success,
        message: result.message,
        error: result.error,
        status: (result as any).status
      });
    }
    
    return result;
  }

  async getProductsByCategory(category: string): Promise<ApiResponse<any[]>> {
    const cacheKey = this.getCacheKey(`/products/category/${category}`);
    const cached = await this.getFromCache<ApiResponse<any[]>>(cacheKey);
    if (cached) return cached;
    const result = await this.request<any>(`/products/category/${encodeURIComponent(category)}`);
    // Normalize server response which may be { data: [...] } or { data: { products: [...] } }
    if (result && (result as any).success) {
      const arr = Array.isArray((result as any).data)
        ? (result as any).data
        : ((result as any).data?.products || []);
      (result as any).data = arr;
      await CacheService.set(cacheKey, result as any, PRODUCT_CACHE_DURATION);
    }
    return result as any;
  }

  async searchProducts(query: string): Promise<ApiResponse<any[]>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return { success: true, data: [] };
    }
    
    const endpoint = `/products/search?q=${encodeURIComponent(trimmedQuery)}`;
    const cacheKey = this.getCacheKey(endpoint);
    
    // Arama sonuçlarını cache'le (kısa süreli - 2 dakika)
    const cached = await this.getFromCache<ApiResponse<any[]>>(cacheKey);
    if (cached && cached.success && Array.isArray(cached.data)) {
      // Cache'den döndür
      return cached;
    }
    
    // API'den çek
    const result = await this.request<any[]>(endpoint);
    
    // Başarılı sonuçları cache'le (2 dakika)
    if (result.success && Array.isArray(result.data)) {
      try {
        await CacheService.set(cacheKey, result, SEARCH_CACHE_DURATION);
      } catch {}
    }
    
    return result;
  }

  async filterProducts(filters: any): Promise<ApiResponse<any[]>> {
    return this.request('/products/filter', 'POST', filters);
  }

  async updateProductStock(id: number, quantity: number): Promise<ApiResponse<boolean>> {
    return this.request(`/products/${id}/stock`, 'PUT', { quantity });
  }

  // Product variations endpoints
  async getProductVariations(productId: number): Promise<ApiResponse<any>> {
    try {
      const cacheKey = this.getCacheKey(`/products/${productId}/variations`);
      const cached = await this.getFromCache<ApiResponse<any>>(cacheKey);

      // Response normalize helper fonksiyonu
      const normalizeVariationsResponse = (responseData: any): any[] => {
        if (!responseData) return [];
        
        // Eğer direkt array ise, döndür
        if (Array.isArray(responseData)) {
          return responseData;
        }
        
        // Eğer object ise ve variations property'si varsa
        if (typeof responseData === 'object' && responseData.variations) {
          return Array.isArray(responseData.variations) ? responseData.variations : [];
        }
        
        // Eğer hiçbiri değilse boş array döndür
        return [];
      };

      // SWR: Eğer cache varsa hemen onu döndür; arkaplanda yenile
      if (cached && cached.success && cached.data) {
        // Arkaplanda yenile (sessiz)
        this.request<any>(`/products/${productId}/variations`)
          .then(async (fresh) => {
            if (fresh && fresh.success) {
              await CacheService.set(cacheKey, fresh, PRODUCT_CACHE_DURATION);
            }
          })
          .catch(() => { });
        
        // Cache'den variations array'ini normalize et ve döndür
        const variations = normalizeVariationsResponse(cached.data);
        return { 
          success: true, 
          data: variations
        } as ApiResponse<any>;
      }

      const result = await this.request<any>(`/products/${productId}/variations`);
      if (result.success && result.data) {
        // Server response format: { success: true, data: { variations: [...], sizeStocks: {} } }
        // veya direkt variations array: { success: true, data: [...] }
        const variations = normalizeVariationsResponse(result.data);
        
        const normalizedResult = {
          success: true,
          data: variations
        };
        
        // Cache'e tam response'u kaydet (sizeStocks da dahil)
        await CacheService.set(cacheKey, result, PRODUCT_CACHE_DURATION);
        return normalizedResult;
      }
      
      // Hata durumunda detaylı log
      console.error(`❌ getProductVariations failed for product ${productId}:`, {
        success: result.success,
        hasData: !!result.data,
        message: result.message,
        error: result.error
      });
      
      return { success: false, data: [], error: result.error || result.message } as ApiResponse<any>;
    } catch (error) {
      console.error('Error fetching product variations:', error);
      return { success: false, data: [], error: String(error) } as ApiResponse<any>;
    }
  }

  async saveProductVariations(tenantId: number, productId: number, variations: any[]): Promise<ApiResponse<boolean>> {
    // Variations disabled
    return { success: true, data: false } as any;
  }

  async updateProductHasVariations(productId: number, hasVariations: boolean): Promise<ApiResponse<boolean>> {
    // Variations disabled
    return { success: true, data: false } as any;
  }

  async getVariationOptions(variationId: number): Promise<ApiResponse<any[]>> {
    // Variations disabled
    return { success: true, data: [] } as any;
  }

  async getVariationOptionById(optionId: number): Promise<ApiResponse<any>> {
    // Variations disabled
    return { success: true, data: null } as any;
  }

  async updateVariationOptionStock(optionId: number, quantity: number): Promise<ApiResponse<boolean>> {
    // Variations disabled
    return { success: true, data: false } as any;
  }

  // Enhanced cart endpoints with optimized caching
  async addToCart(cartData: any): Promise<ApiResponse<boolean>> {
    return this.request<boolean>('/cart', 'POST', cartData);
  }

  async removeFromCart(id: number, userId?: number): Promise<ApiResponse<boolean>> {
    // userId varsa query string'e ekle
    let endpoint = `/cart/${id}`;
    if (userId) {
      endpoint += `?userId=${userId}`;
    }
    return this.request<boolean>(endpoint, 'DELETE');
  }

  async checkCartBeforeLogout(userId: number, deviceId?: string): Promise<ApiResponse<{
    hasItems: boolean;
    itemCount?: number;
    totalPrice?: number;
    message: string;
  }>> {
    return this.request('/cart/check-before-logout', 'POST', { userId, deviceId });
  }


  async updateCartQuantity(id: number, quantity: number): Promise<ApiResponse<boolean>> {
    return this.request<boolean>(`/cart/${id}`, 'PUT', { quantity });
  }

  // Return requests endpoints
  async getReturnRequests(userId: number): Promise<ApiResponse<any[]>> {
    return this.request(`/return-requests?userId=${encodeURIComponent(userId)}`, 'GET');
  }

  async createReturnRequest(requestData: {
    userId: number;
    orderId: number;
    orderItemId: number;
    reason: string;
    description?: string;
  }): Promise<ApiResponse<{ returnRequestId: number }>> {
    return this.request('/return-requests', 'POST', requestData);
  }

  async cancelReturnRequest(returnRequestId: number, userId: number): Promise<ApiResponse<boolean>> {
    return this.request(`/return-requests/${returnRequestId}/cancel`, 'PUT', { userId });
  }

  async getReturnableOrders(userId: number): Promise<ApiResponse<any[]>> {
    return this.request(`/orders/returnable?userId=${encodeURIComponent(userId)}`, 'GET');
  }

  // Payment endpoints
  async processPayment(paymentData: any): Promise<ApiResponse<any>> {
    return this.request('/payments/process', 'POST', paymentData);
  }

  async getPaymentStatus(paymentId: string): Promise<ApiResponse<any>> {
    return this.request(`/payments/${paymentId}/status`, 'GET');
  }

  async getTestCards(): Promise<ApiResponse<any>> {
    return this.request('/payments/test-cards', 'GET');
  }

  async getCartItems(userId: number): Promise<ApiResponse<any[]>> {
    // Giriş yapmamış kullanıcılar için boş sepet döndür
    if (!userId || userId <= 0) {
      return { success: true, data: [], message: 'Sepet görüntülemek için giriş yapın' };
    }

    const endpoint = `/cart/user/${userId}`;
    return this.request<any[]>(endpoint);
  }

  async clearCart(userId: number): Promise<ApiResponse<boolean>> {
    let endpoint = `/cart/user/${userId}`;
    if (userId === 1) {
      try {
        const { DiscountWheelController } = require('../controllers/DiscountWheelController');
        const deviceId = await DiscountWheelController.getDeviceId();
        endpoint += `?deviceId=${encodeURIComponent(deviceId)}`;
      } catch { }
    }
    return this.request(endpoint, 'DELETE');
  }

  async getCartTotal(userId: number): Promise<ApiResponse<number>> {
    let endpoint = `/cart/user/${userId}/total`;
    if (userId === 1) {
      try {
        const { DiscountWheelController } = require('../controllers/DiscountWheelController');
        const deviceId = await DiscountWheelController.getDeviceId();
        endpoint += `?deviceId=${encodeURIComponent(deviceId)}`;
      } catch { }
    }
    return this.request(endpoint);
  }

  async getCartTotalDetailed(userId: number): Promise<ApiResponse<{ subtotal: number; discount: number; shipping: number; total: number }>> {
    let endpoint = `/cart/user/${userId}/total-detailed`;
    if (userId === 1) {
      try {
        const { DiscountWheelController } = require('../controllers/DiscountWheelController');
        const deviceId = await DiscountWheelController.getDeviceId();
        endpoint += `?deviceId=${encodeURIComponent(deviceId)}`;
      } catch { }
    }
    return this.request(endpoint);
  }

  async getCampaigns(): Promise<ApiResponse<any[]>> {
    return this.request('/campaigns');
  }

  async createCampaign(data: any): Promise<ApiResponse<boolean>> {
    return this.request('/campaigns', 'POST', data);
  }

  // Enhanced order endpoints
  async createOrder(orderData: any): Promise<ApiResponse<{ orderId: number }>> {
    // Try multiple compatible endpoints for different backends
    const endpoints = ['/orders', '/orders/create', '/order', '/orders/new'];
    for (const ep of endpoints) {
      const raw = await this.request<any>(ep, 'POST', orderData);

      // Normalize diverse backend responses to a common ApiResponse
      const orderId = (raw as any)?.data?.orderId
        ?? (raw as any)?.orderId
        ?? (raw as any)?.id
        ?? (typeof (raw as any)?.data === 'number' ? (raw as any).data : undefined);

      const success = Boolean((raw as any)?.success) || typeof orderId !== 'undefined';

      if (success) {
        return {
          success: true,
          data: { orderId: Number(orderId) || Number((raw as any)?.data?.id) || 0 },
          message: (raw as any)?.message || 'Order created'
        } as ApiResponse<{ orderId: number }>;
      }
    }
    return { success: false, message: 'Error creating order' } as any;
  }

  async getUserOrders(userId: number): Promise<ApiResponse<any[]>> {
    return this.request(`/orders/user/${userId}`);
  }

  async getOrderById(id: number): Promise<ApiResponse<any>> {
    return this.request(`/orders/${id}`);
  }

  async updateOrderStatus(id: number, status: string): Promise<ApiResponse<boolean>> {
    return this.request(`/orders/${id}/status`, 'PUT', { status });
  }

  async cancelOrder(id: number): Promise<ApiResponse<boolean>> {
    return this.request(`/orders/${id}/cancel`, 'PUT');
  }

  // Enhanced review endpoints
  async createReview(reviewData: any): Promise<ApiResponse<{ reviewId: number }>> {
    return this.request('/reviews', 'POST', reviewData);
  }

  async getProductReviews(productId: number): Promise<ApiResponse<any[]>> {
    return this.request(`/reviews/product/${productId}`);
  }

  // ✅ OPTIMIZASYON: Enhanced utility endpoints with SWR caching
  async getCategories(): Promise<ApiResponse<string[]>> {
    const cacheKey = this.getCacheKey('/categories');
    const cached = await this.getFromCache<ApiResponse<string[]>>(cacheKey);

    // SWR pattern: cache varsa hemen döndür, arkaplanda yenile
    if (cached && cached.success) {
      this.request<string[]>('/categories')
        .then(async (fresh) => {
          if (fresh && fresh.success) {
            await this.setCache(cacheKey, fresh, false);
          }
        })
        .catch(() => { });
      return cached;
    }

    const result = await this.request<string[]>('/categories');
    if (result.success) {
      await this.setCache(cacheKey, result, false);
    }
    return result;
  }

  async getBrands(): Promise<ApiResponse<string[]>> {
    const cacheKey = this.getCacheKey('/brands');
    const cached = await this.getFromCache<ApiResponse<string[]>>(cacheKey);

    // SWR pattern: cache varsa hemen döndür, arkaplanda yenile
    if (cached && cached.success) {
      this.request<string[]>('/brands')
        .then(async (fresh) => {
          if (fresh && fresh.success) {
            await this.setCache(cacheKey, fresh, false);
          }
        })
        .catch(() => { });
      return cached;
    }

    const result = await this.request<string[]>('/brands');
    if (result.success) {
      await this.setCache(cacheKey, result, false);
    }
    return result;
  }

  // Store locator & in-store availability
  async getStoresNearby(lat: number, lng: number, radiusKm: number = 25): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/stores/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  }

  async getInStoreAvailability(productId: number, lat: number, lng: number, radiusKm: number = 25): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/stores/availability/${productId}?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  }

  // Referral program
  async getReferralInfo(userId: number): Promise<ApiResponse<{ code: string; url: string; invitedCount: number; rewardBalance: number }>> {
    return this.request(`/referral/${userId}`);
  }

  async generateReferralLink(userId: number): Promise<ApiResponse<{ code: string; url: string }>> {
    return this.request(`/referral/${userId}/generate`, 'POST');
  }

  async applyReferralCode(userId: number, code: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/referral/apply`, 'POST', { userId, code });
  }

  async getPriceRange(): Promise<ApiResponse<{ min: number; max: number }>> {
    const cacheKey = this.getCacheKey('/products/price-range');
    const cached = await this.getFromCache<ApiResponse<{ min: number; max: number }>>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.request<{ min: number; max: number }>('/products/price-range');
    if (result.success) {
      await this.setCache(cacheKey, result, result.isOffline);
    }
    return result;
  }

  // XML Sync endpoints
  async getSyncStatus(): Promise<ApiResponse<any>> {
    return this.request('/sync/status');
  }

  async triggerManualSync(): Promise<ApiResponse<boolean>> {
    return this.request('/sync/trigger', 'POST');
  }

  async getXmlSources(): Promise<ApiResponse<any[]>> {
    return this.request('/sync/sources');
  }

  // Enhanced cache management
  clearCache(): void {
    this.cache.clear();
    // Cache cleared
  }

  clearCacheByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    // Cleared cache entries matching pattern
  }

  // Enhanced connection testing with auto-detection
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      // Testing API connection

      // Quick timeout for health check
      const healthTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Health check timeout'));
        }, 15000); // 15 saniye health check timeout
      });

      const healthPromise = this.request<boolean>('/health');

      const result = await Promise.race([healthPromise, healthTimeout]);
      this.isOnline = result.success;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures = 0;

      if (result.success) {
        // API connection successful
        // Process any queued offline requests
        await this.processOfflineQueue();
      } else {
        // API connection failed, trying auto-detection

        // Try auto-detection if health check failed
        try {
          const newUrl = await this.autoDetectApiUrl();
          if (newUrl !== currentApiUrl) {
            // Test again with new URL
            const retryResult = await this.request<boolean>('/health');
            if (retryResult.success) {
              // API connection successful with new URL
              this.isOnline = true;
              await this.processOfflineQueue();
              return retryResult;
            }
          }
        } catch (detectionError) {
          // Auto-detection failed - silent
        }
      }

      return result;
    } catch (error) {
      // API connection test failed
      this.isOnline = false;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures = 0;
      return {
        success: false,
        error: 'Connection test failed',
        isOffline: true
      };
    }
  }

  // Enhanced network status with periodic checking
  async checkNetworkStatus(): Promise<boolean> {
    try {
      // If we're already offline, don't check immediately
      if (!this.isOnline) {
        // Already offline, skipping immediate check
        return false;
      }

      const result = await this.testConnection();
      this.isOnline = result.success;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures = 0;

      // If we're back online, process offline queue
      if (this.isOnline && this.offlineQueue.length > 0) {
        // Processing offline requests
        await this.processOfflineQueue();
      }

      return result.success;
    } catch {
      this.isOnline = false;
      this.lastOnlineCheck = Date.now();
      this.consecutiveFailures = 0;
      return false;
    }
  }

  // Periodic network status check with exponential backoff
  startNetworkMonitoring(intervalMs: number = 30000): void {
    if (this.networkMonitoringInterval) {
      clearInterval(this.networkMonitoringInterval);
    }

    let currentInterval = intervalMs;

    this.networkMonitoringInterval = setInterval(async () => {
      try {
        const isOnline = await this.checkNetworkStatus();

        if (isOnline) {
          // Reset on success
          this.consecutiveFailures = 0;
          currentInterval = intervalMs;
        } else {
          // Increase interval on failure
          this.consecutiveFailures++;
          currentInterval = Math.min(currentInterval * 1.5, 120000); // Max 2 minutes

          // Network check failed, next check scheduled

          // Update interval
          clearInterval(this.networkMonitoringInterval!);
          this.networkMonitoringInterval = setInterval(async () => {
            await this.checkNetworkStatus();
          }, currentInterval);
        }
      } catch (error) {
        console.error('❌ Network monitoring error:', error);
      }
    }, currentInterval);

    // Network monitoring started
  }

  stopNetworkMonitoring(): void {
    if (this.networkMonitoringInterval) {
      clearInterval(this.networkMonitoringInterval);
      this.networkMonitoringInterval = null;
      // Network monitoring stopped
    }
  }

  // Force offline mode for testing or when network is definitely down
  forceOfflineMode(): void {
    // Force offline mode activated
    this.isOnline = false;
    this.stopNetworkMonitoring();
  }

  // Check if we should attempt to go online
  shouldAttemptOnline(): boolean {
    // Don't attempt if we've been offline for too long
    const lastOnlineCheck = this.lastOnlineCheck || 0;
    const timeSinceLastCheck = Date.now() - lastOnlineCheck;

    // Only attempt every 5 minutes
    return timeSinceLastCheck > 5 * 60 * 1000;
  }

  // Get current network status with more details
  getNetworkStatus(): { isOnline: boolean; queueLength: number; lastCheck: number; consecutiveFailures: number } {
    return {
      isOnline: this.isOnline,
      queueLength: this.offlineQueue.length,
      lastCheck: this.lastOnlineCheck || 0,
      consecutiveFailures: this.consecutiveFailures || 0
    };
  }

  // Force online mode (for testing)
  forceOnlineMode(): void {
    this.isOnline = true;
    this.processOfflineQueue();
  }


  // Wallet API methods
  async getWallet(userId: number): Promise<ApiResponse<{ balance: number, currency: string, transactions: any[] }>> {
    return this.request<{ balance: number, currency: string, transactions: any[] }>(`/wallet/${userId}`);
  }

  // Homepage products (server-side cached via Redis/DB)
  async getHomepageProducts(userId: number): Promise<ApiResponse<{ popular: any[]; newProducts: any[]; polar: any[]; generatedAt: string }>> {
    return this.request<{ popular: any[]; newProducts: any[]; polar: any[]; generatedAt: string }>(`/users/${userId}/homepage-products`);
  }

  async addMoneyToWallet(userId: number, amount: number, paymentMethod: string, description?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/wallet/${userId}/add-money`, 'POST', {
      amount,
      paymentMethod,
      description
    });
  }


  async getWalletTransactions(userId: number, limit: number = 50, offset: number = 0): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/wallet/${userId}/transactions?limit=${limit}&offset=${offset}`);
  }

  // Custom Production Requests API methods
  async getCustomProductionRequests(
    userId: number,
    options: { limit?: number; offset?: number; status?: string; forceRefresh?: boolean } = {}
  ): Promise<ApiResponse<any[]>> {
    const { limit = 50, offset = 0, status, forceRefresh } = options;
    let url = `/custom-production-requests/${userId}?limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    if (forceRefresh) {
      url += `&t=${Date.now()}`; // cache-buster
    }
    return this.request<any[]>(url);
  }

  async getCustomProductionRequest(userId: number, requestId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/custom-production-requests/${userId}/${requestId}`);
  }

  async createCustomProductionRequest(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/custom-production-requests', 'POST', data);
  }

  async updateCustomProductionRequestStatus(
    requestId: number,
    status: string,
    options: {
      estimatedDeliveryDate?: string;
      actualDeliveryDate?: string;
      notes?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/custom-production-requests/${requestId}/status`, 'PUT', {
      status,
      ...options
    });
  }

  // Custom production messages
  async sendCustomProductionMessage(requestId: number, userKey: string | number, message: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/custom-production-requests/${requestId}/messages`, 'POST', { userKey, message });
  }

  async listCustomProductionMessages(requestId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/custom-production-requests/${requestId}/messages`);
  }

  // Generic HTTP methods for campaign system
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET');
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', data);
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PATCH', data);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE');
  }

  // Dealership Application Methods
  async getDealershipApplications(email: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.get(`/dealership/applications/user/${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      console.error('Error fetching dealership applications:', error);
      return { success: false, message: 'Başvurular yüklenemedi' };
    }
  }

  async getDealershipApplication(id: number, email: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.get(`/dealership/applications/${id}/user/${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      console.error('Error fetching dealership application:', error);
      return { success: false, message: 'Başvuru detayları yüklenemedi' };
    }
  }

  async submitDealershipApplication(data: {
    companyName: string;
    fullName: string;
    phone: string;
    email: string;
    city: string;
    message?: string;
    estimatedMonthlyRevenue: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.post('/dealership/applications', {
        ...data,
        source: 'mobile-app'
      });
      return response;
    } catch (error) {
      console.error('Error submitting dealership application:', error);
      return { success: false, message: 'Başvuru gönderilemedi' };
    }
  }
}

export const apiService = new ApiService();

// Güvenli JSON parse yardımcı fonksiyonu
export async function safeJsonParse(response: Response): Promise<any> {
  try {
    const responseText = await response.text();

    // Boş veya geçersiz response kontrolü
    if (!responseText || responseText.trim() === '' || responseText === 'undefined') {
      return null;
    }

    const trimmed = responseText.trim();
    
    // JSON formatında olup olmadığını kontrol et
    const firstChar = trimmed.charAt(0);
    const looksLikeJson = firstChar === '{' || firstChar === '[' || 
                         firstChar === '"' || 
                         trimmed === 'true' || trimmed === 'false' || trimmed === 'null' ||
                         /^-?\d/.test(trimmed);
    
    if (!looksLikeJson) {
      return null;
    }

    // JSON parse et
    return JSON.parse(responseText);
  } catch (error) {
    // Silently handle parse errors
    return null;
  }
}

// Varsayılan API anahtarı kaldırıltı; uygulama içi konfigürasyondan veya kullanıcı oturumundan set edilmelidir.
export default apiService;
