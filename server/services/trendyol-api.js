// Trendyol API Service
// Trendyol Marketplace API entegrasyonu için servis

const https = require('https');
const zlib = require('zlib');

const TRENDYOL_API_BASE_URL = 'https://api.trendyol.com/sapigw/suppliers';
const TRENDYOL_PRODUCT_API_BASE_URL = 'https://apigw.trendyol.com/integration/product';

// Rate limiting için son istek zamanını takip et
// Trendyol API Servis Limitleri: https://developers.trendyol.com/docs/trendyol-servis-limitleri
let lastRequestTime = 0;
let requestCountInMinute = 0;
let requestCountInHour = 0;
let minuteStartTime = Date.now();
let hourStartTime = Date.now();

// Trendyol API Servis Limitleri (Canlı Ortam Limitleri)
// Ürün Aktarma: 1000 req/min
// Ürün Güncelleme: 1000 req/min
// Stok ve Fiyat Güncelleme: NO LIMIT
// Ürün Filtreleme: 2000 req/min
// TY Marka Listesi: 50 req/min
// TY Kategori Listesi: 50 req/min
// Ürün Silme: 100 req/min
// Güvenli limitler: Resmi limitlerin %80'i (429 hatası önleme için)
const MIN_REQUEST_INTERVAL = 60; // İstekler arası minimum bekleme süresi (ms) - 60ms = ~16.6 istek/saniye (1000 req/min için güvenli)
const MAX_REQUESTS_PER_SECOND = 16; // Saniyede maksimum istek sayısı (güvenli limit)
const MAX_REQUESTS_PER_MINUTE = 800; // Dakikada maksimum istek sayısı (güvenli limit: 1000'ün %80'i)
const MAX_REQUESTS_PER_HOUR = 48000; // Saatte maksimum istek sayısı (güvenli limit)

// Cache mekanizması - sipariş detaylarını cache'le
const orderDetailCache = new Map();
const orderListCache = new Map();
const productListCache = new Map();
const ORDER_CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache süresi
const ORDER_LIST_CACHE_TTL = 2 * 60 * 1000; // 2 dakika sipariş listesi cache
const PRODUCT_LIST_CACHE_TTL = 1 * 60 * 1000; // 1 dakika ürün listesi cache (daha kısa süre - güncel veri için)

// HTTP connection pooling için agent
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5
});

class TrendyolAPIService {
  /**
   * Rate limiting kontrolü - DEVRE DIŞI
   * Rate limitler kaldırıldı, anında istek gönderiliyor
   * @param {string} endpoint - API endpoint (artık kullanılmıyor)
   */
  static async waitForRateLimit(endpoint = '') {
    // Rate limitler kaldırıldı - hiçbir bekleme yapılmıyor
    return Promise.resolve();
  }
  
  /**
   * Rate limiting sayaçlarını sıfırla (sunucu yeniden başlatıldığında veya manuel olarak)
   */
  static resetRateLimitCounters() {
    requestCountInMinute = 0;
    requestCountInHour = 0;
    minuteStartTime = Date.now();
    hourStartTime = Date.now();
    lastRequestTime = 0;
    console.log('🔄 Rate limit sayaçları sıfırlandı');
  }
  
  /**
   * Rate limiting durumunu al (debug için)
   */
  static getRateLimitStatus() {
    return {
      requestCountInMinute,
      requestCountInHour,
      minuteStartTime,
      hourStartTime,
      lastRequestTime,
      minuteElapsed: Date.now() - minuteStartTime,
      hourElapsed: Date.now() - hourStartTime,
      maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
      maxRequestsPerHour: MAX_REQUESTS_PER_HOUR
    };
  }

  /**
   * Cache'i temizle (eski cache'leri kaldır)
   */
  static clearExpiredCache() {
    const now = Date.now();
    
    // Sipariş detay cache'ini temizle
    for (const [key, value] of orderDetailCache.entries()) {
      if (now - value.timestamp > ORDER_CACHE_TTL) {
        orderDetailCache.delete(key);
      }
    }
    
    // Sipariş listesi cache'ini temizle
    for (const [key, value] of orderListCache.entries()) {
      if (now - value.timestamp > ORDER_LIST_CACHE_TTL) {
        orderListCache.delete(key);
      }
    }
    
    // Ürün listesi cache'ini temizle
    for (const [key, value] of productListCache.entries()) {
      if (now - value.timestamp > PRODUCT_LIST_CACHE_TTL) {
        productListCache.delete(key);
      }
    }
  }

  /**
   * Tüm cache'i temizle
   */
  static clearAllCache() {
    orderDetailCache.clear();
    orderListCache.clear();
    productListCache.clear();
  }
  /**
   * Trendyol API için Basic Auth header oluştur
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {string} Base64 encoded authorization header
   */
  static createAuthHeader(apiKey, apiSecret) {
    if (!apiKey || !apiSecret) {
      throw new Error('API Key ve API Secret gereklidir');
    }
    // API Key ve Secret'ı temizle
    // - Başında/sonunda boşluk, newline, carriage return gibi karakterleri kaldır
    // - İçindeki özel karakterleri koru (API Key/Secret'ın kendisi özel karakter içerebilir)
    let cleanApiKey = String(apiKey || '').trim();
    let cleanApiSecret = String(apiSecret || '').trim();
    
    // Görünmez karakterleri temizle (newline, carriage return, tab vb.)
    cleanApiKey = cleanApiKey.replace(/[\r\n\t]/g, '');
    cleanApiSecret = cleanApiSecret.replace(/[\r\n\t]/g, '');
    
    if (!cleanApiKey || !cleanApiSecret) {
      throw new Error('API Key ve API Secret boş olamaz');
    }
    
    // API Key ve Secret uzunluk kontrolü (çok kısa ise uyarı)
    // Trendyol API Key genellikle 20+ karakter, Secret 30+ karakter olur
    if (cleanApiKey.length < 10 || cleanApiSecret.length < 10) {
      console.warn('⚠️ API Key veya Secret çok kısa görünüyor. Lütfen Trendyol Partner Panel\'den doğru değerleri kopyaladığınızdan emin olun.');
      console.warn(`  API Key uzunluk: ${cleanApiKey.length}`);
      console.warn(`  API Secret uzunluk: ${cleanApiSecret.length}`);
    }
    
    // Trendyol API formatı: apiKey:apiSecret (UTF-8 encoding ile Base64)
    // Format: Basic base64(apiKey:apiSecret)
    // Trendyol dokümantasyonuna göre: API Key:API Secret formatı kullanılmalı
    const credentials = `${cleanApiKey}:${cleanApiSecret}`;
    // UTF-8 encoding ile Base64 encode et
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    
    // Base64 encoding doğrulama
    try {
      const decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
      if (decoded !== credentials) {
        console.error('❌ Base64 encoding hatası!');
      }
    } catch (error) {
      console.error('❌ Base64 encoding doğrulama hatası:', error);
    }
    
    // Debug için (sadece DEBUG_TRENDYOL aktifse veya hata durumunda)
    if (process.env.DEBUG_TRENDYOL === 'true') {
      console.log('🔐 Trendyol Auth Debug:');
      console.log('  API Key uzunluk:', cleanApiKey.length);
      console.log('  API Secret uzunluk:', cleanApiSecret.length);
      console.log('  API Key (ilk 8 karakter):', cleanApiKey.substring(0, 8) + '***');
      console.log('  API Secret (son 4 karakter):', '***' + cleanApiSecret.substring(cleanApiSecret.length - 4));
      console.log('  Credentials format:', 'apiKey:apiSecret');
      console.log('  Encoded (ilk 30 karakter):', encodedCredentials.substring(0, 30) + '...');
    }
    
    return `Basic ${encodedCredentials}`;
  }

  /**
   * Trendyol API'ye HTTP isteği gönder
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint (örn: /suppliers/{supplierId}/orders)
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} data - Request body (POST/PUT için)
   * @param {object} queryParams - Query parameters
   * @param {string} supplierId - Trendyol Supplier ID (User-Agent için)
   * @returns {Promise<object>} API response
   */
  static async makeRequest(method, endpoint, apiKey, apiSecret, data = null, queryParams = {}, supplierId = null) {
    // Rate limiting kontrolü (endpoint'e göre özel rate limiting)
    await this.waitForRateLimit(endpoint);
    
    return new Promise((resolve, reject) => {
      // API Key ve Secret'ı temizle
      const cleanApiKey = String(apiKey || '').trim();
      const cleanApiSecret = String(apiSecret || '').trim();
      
      if (!cleanApiKey || !cleanApiSecret) {
        return reject({
          success: false,
          error: 'API Key veya API Secret boş veya geçersiz',
          statusCode: 400
        });
      }
      
      const authHeader = this.createAuthHeader(cleanApiKey, cleanApiSecret);
      
      // Query parameters ekle
      let url = `${TRENDYOL_API_BASE_URL}${endpoint}`;
      const queryString = Object.keys(queryParams)
        .filter(key => queryParams[key] !== null && queryParams[key] !== undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      if (queryString) {
        url += `?${queryString}`;
      }

      const urlObj = new URL(url);
      
      // User-Agent'ı Trendyol API formatına göre ayarla (supplierId ile)
      // Trendyol dokümantasyonuna göre: supplierId - SelfIntegration formatı kullanılmalı
      const userAgent = supplierId ? `${supplierId} - SelfIntegration` : 'SelfIntegration';
      
      // Header'ları method'a göre ayarla
      // GET istekleri için çok minimal header'lar (Cloudflare bypass için agresif yaklaşım)
      // POST/PUT istekleri için tam header'lar
      const headers = {
        'Authorization': authHeader,
        'Accept': 'application/json'
      };
      
      // POST/PUT istekleri için ek header'lar
      if (method === 'POST' || method === 'PUT') {
        headers['Content-Type'] = 'application/json';
        headers['Accept-Language'] = 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7';
        headers['Accept-Encoding'] = 'gzip, deflate';
        headers['User-Agent'] = userAgent;
        headers['Connection'] = 'keep-alive';
        headers['Origin'] = 'https://api.trendyol.com';
        headers['Referer'] = 'https://api.trendyol.com/';
        headers['Sec-Fetch-Dest'] = 'empty';
        headers['Sec-Fetch-Mode'] = 'cors';
        headers['Sec-Fetch-Site'] = 'same-origin';
      } else {
        // GET istekleri için çok minimal header'lar (User-Agent ve Connection kaldırıldı)
        // Sadece Authorization ve Accept - Cloudflare bypass için
        headers['Accept-Encoding'] = 'gzip, deflate';
      }
      
      // GET istekleri için connection pooling'i kapat (Cloudflare bypass için)
      // Her istekte yeni connection açılması Cloudflare'i daha az şüphelendirir
      const useAgent = (method === 'GET' && endpoint.includes('/products')) ? false : httpsAgent;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        agent: useAgent, // GET /products için connection pooling kapalı
        headers: headers
      };

      // Console log - İstek detayları (sadece önemli istekler için)
      const isImportantRequest = endpoint.includes('/orders') && !endpoint.includes('/orders/');
      if (isImportantRequest || process.env.DEBUG_TRENDYOL === 'true') {
        console.log('📤 Trendyol API İsteği:');
        console.log('  Method:', method);
        console.log('  Endpoint:', endpoint);
        console.log('  Supplier ID:', supplierId);
        console.log('  API Key (ilk 4 karakter):', cleanApiKey.substring(0, 4) + '***');
        console.log('  API Secret (var mı):', cleanApiSecret ? 'Evet (' + cleanApiSecret.length + ' karakter)' : 'Hayır');
        console.log('  Auth Header (ilk 30 karakter):', authHeader.substring(0, 30) + '...');
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        // Content-Encoding header'ını kontrol et ve uygun decompression stream kullan
        const contentEncoding = res.headers['content-encoding'];
        let responseStream = res;
        
        if (contentEncoding === 'gzip') {
          responseStream = res.pipe(zlib.createGunzip());
        } else if (contentEncoding === 'deflate') {
          responseStream = res.pipe(zlib.createInflate());
        } else if (contentEncoding === 'br') {
          responseStream = res.pipe(zlib.createBrotliDecompress());
        }

        responseStream.on('data', (chunk) => {
          // Buffer'ı string'e çevir
          if (Buffer.isBuffer(chunk)) {
            responseData += chunk.toString('utf8');
          } else {
            responseData += chunk;
          }
        });
        
        responseStream.on('error', (error) => {
          console.log('❌ Trendyol API Decompression Hatası:', error.message);
          reject({
            success: false,
            error: 'Yanıt açma hatası: ' + error.message,
            statusCode: res.statusCode || 500
          });
        });

        responseStream.on('end', () => {
          // Cloudflare 403 hatası kontrolü - HTML yanıt kontrolü
          if (responseData && (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<!doctype') || responseData.includes('Cloudflare'))) {
            console.log('❌ Trendyol API Cloudflare/HTML Yanıt Hatası');
            console.log('  Status Code:', res.statusCode);
            console.log('  Endpoint:', endpoint);
            console.log('  Method:', method);
            console.log('  Supplier ID:', supplierId);
            console.log('  Response Preview:', responseData.substring(0, 300));
            
            // 403 hatası için özel öneriler
            let errorMessage = 'Trendyol API\'ye erişim engellendi. ';
            let suggestions = [];
            
            if (responseData.includes('Cloudflare') || responseData.includes('cloudflare')) {
              errorMessage += 'Cloudflare güvenlik koruması tetiklendi. ';
              suggestions.push('Sunucu IP adresiniz geçici olarak engellenmiş olabilir');
              suggestions.push('Birkaç dakika bekleyip tekrar deneyin');
              suggestions.push('API Key ve API Secret bilgilerinizi kontrol edin');
              suggestions.push('Rate limit aşılmış olabilir, daha yavaş istek gönderin');
            } else {
              errorMessage += 'Beklenmeyen bir HTML yanıt alındı. ';
              suggestions.push('API endpoint\'i kontrol edin');
              suggestions.push('Kimlik bilgilerinizi kontrol edin');
              suggestions.push('Request formatını Trendyol dokümantasyonuna göre kontrol edin');
            }
            
            console.log('  Öneriler:', suggestions.join(', '));
            
            return reject({
              success: false,
              error: errorMessage + ' Öneriler: ' + suggestions.join('; '),
              statusCode: res.statusCode || 403,
              rawResponse: responseData.substring(0, 2000),
              isCloudflareBlock: true,
              suggestions: suggestions
            });
          }
          
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            
            // Console log - Yanıt detayları (sadece hatalar ve önemli istekler için)
            const isImportantRequest = endpoint.includes('/orders') && !endpoint.includes('/orders/');
            if (!isImportantRequest && res.statusCode >= 200 && res.statusCode < 300) {
              // Başarılı detay istekleri için log yok (performans için)
            } else {
              console.log('📥 Trendyol API Yanıtı:');
              console.log('  Status Code:', res.statusCode);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                if (isImportantRequest) {
                  const content = jsonData.content || jsonData;
                  const count = Array.isArray(content) ? content.length : (content?.totalElements || 0);
                  console.log(`  ✅ Başarılı - ${count} kayıt`);
                }
              } else {
                console.log('  Error:', jsonData.message || jsonData.error || 'API request failed');
                if (res.statusCode === 401) {
                  console.log('  ❌ 401 Unauthorized - Authentication hatası');
                }
                if (res.statusCode === 429) {
                  console.log('  ⚠️ 429 Too Many Requests - Rate limit aşıldı');
                }
                if (res.statusCode === 403) {
                  console.log('  ⚠️ 403 Forbidden - Erişim engellendi');
                }
              }
            }
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                data: jsonData,
                statusCode: res.statusCode
              });
            } else {
              // 401 ve 429 hataları için daha açıklayıcı mesaj
              let errorMessage = jsonData.message || jsonData.error || 'API request failed';
              if (res.statusCode === 401) {
                errorMessage = 'Trendyol API kimlik doğrulama hatası. Lütfen API Key ve API Secret bilgilerinizi kontrol edin.';
                if (jsonData.errors && Array.isArray(jsonData.errors) && jsonData.errors.length > 0) {
                  const firstError = jsonData.errors[0];
                  if (firstError.message) {
                    errorMessage += ` Detay: ${firstError.message}`;
                  }
                }
              } else if (res.statusCode === 429) {
                errorMessage = 'Trendyol API rate limit aşıldı. İstekler yavaşlatılıyor, lütfen tekrar deneyin.';
                // Retry-After header'ı varsa kullan
                const retryAfter = res.headers['retry-after'] || res.headers['Retry-After'];
                if (retryAfter) {
                  errorMessage += ` Önerilen bekleme süresi: ${retryAfter} saniye`;
                }
              } else if (res.statusCode === 403) {
                errorMessage = 'Trendyol API erişim engellendi. Lütfen API Key ve API Secret bilgilerinizi kontrol edin veya birkaç dakika bekleyip tekrar deneyin.';
              }
              
              reject({
                success: false,
                error: errorMessage,
                statusCode: res.statusCode,
                data: jsonData,
                retryAfter: res.headers['retry-after'] || res.headers['Retry-After']
              });
            }
          } catch (error) {
            console.log('❌ Trendyol API JSON Parse Hatası:', error.message);
            console.log('  Status Code:', res.statusCode);
            console.log('  Endpoint:', endpoint);
            console.log('  Raw Response:', responseData.substring(0, 500));
            
            // HTML yanıt kontrolü (parse hatasından önce kontrol edilmişti ama tekrar kontrol edelim)
            if (responseData && (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<!doctype') || responseData.includes('Cloudflare'))) {
              let errorMessage = 'Trendyol API\'ye erişim engellendi. ';
              if (responseData.includes('Cloudflare') || responseData.includes('cloudflare')) {
                errorMessage += 'Cloudflare güvenlik koruması tetiklendi. Lütfen birkaç dakika bekleyip tekrar deneyin.';
              } else {
                errorMessage += 'Beklenmeyen bir HTML yanıt alındı.';
              }
              
              return reject({
                success: false,
                error: errorMessage,
                statusCode: res.statusCode || 403,
                rawResponse: responseData.substring(0, 2000),
                isCloudflareBlock: true
              });
            }
            
            reject({
              success: false,
              error: 'Invalid JSON response',
              statusCode: res.statusCode,
              rawResponse: responseData.substring(0, 2000)
            });
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Trendyol API Network Hatası:', error.message);
        reject({
          success: false,
          error: error.message || 'Network error',
          statusCode: 0
        });
      });

      // Request body gönder (POST/PUT için)
      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Trendyol siparişlerini çek (cache ile optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (startDate, endDate, page, size, orderByField, orderByDirection, status)
   * @param {boolean} useCache - Cache kullanılsın mı (varsayılan: true)
   * @returns {Promise<object>} Sipariş listesi
   */
  static async getOrders(supplierId, apiKey, apiSecret, options = {}, useCache = true) {
    try {
      const {
        startDate,
        endDate,
        page = 0,
        size = 200,
        orderByField = 'PackageLastModifiedDate',
        orderByDirection = 'DESC',
        status
      } = options;

      const queryParams = {
        page,
        size,
        orderByField,
        orderByDirection
      };

      if (startDate) {
        queryParams.startDate = startDate;
      }
      if (endDate) {
        queryParams.endDate = endDate;
      }
      if (status) {
        queryParams.status = status;
      }

      // Cache kontrolü (sadece sayfa 0 ve cache kullanılıyorsa)
      if (useCache && page === 0 && !startDate && !endDate) {
        const cacheKey = `${supplierId}_${status || 'all'}_${size}`;
        if (orderListCache.has(cacheKey)) {
          const cached = orderListCache.get(cacheKey);
          if (Date.now() - cached.timestamp < ORDER_LIST_CACHE_TTL) {
            return cached.data;
          } else {
            orderListCache.delete(cacheKey);
          }
        }
      }

      const endpoint = `/${supplierId}/orders`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        3, // maxRetries
        0 // Delay kaldırıldı - rate limitler devre dışı
      );

      // Cache'e kaydet (sadece sayfa 0 ve başarılı ise)
      if (useCache && page === 0 && !startDate && !endDate && response.success) {
        const cacheKey = `${supplierId}_${status || 'all'}_${size}`;
        orderListCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrders error:', error);
      throw error;
    }
  }

  /**
   * Trendyol sipariş detayını çek (cache ile optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} orderNumber - Sipariş numarası
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {boolean} useCache - Cache kullanılsın mı (varsayılan: true)
   * @returns {Promise<object>} Sipariş detayı
   */
  static async getOrderDetail(supplierId, orderNumber, apiKey, apiSecret, useCache = true) {
    try {
      // Cache kontrolü
      const cacheKey = `${supplierId}_${orderNumber}`;
      if (useCache && orderDetailCache.has(cacheKey)) {
        const cached = orderDetailCache.get(cacheKey);
        if (Date.now() - cached.timestamp < ORDER_CACHE_TTL) {
          return cached.data;
        } else {
          orderDetailCache.delete(cacheKey);
        }
      }

      const endpoint = `/${supplierId}/orders/${orderNumber}`;
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3, // maxRetries
        0 // Delay kaldırıldı - rate limitler devre dışı
      );

      // Cache'e kaydet
      if (useCache && response.success) {
        orderDetailCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }

      return response;
    } catch (error) {
      console.error('❌ Trendyol API getOrderDetail error:', error);
      throw error;
    }
  }

  /**
   * Birden fazla sipariş detayını batch olarak çek (optimize edilmiş)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string[]} orderNumbers - Sipariş numaraları dizisi
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {number} batchSize - Her batch'te kaç sipariş çekilecek (varsayılan: 5)
   * @returns {Promise<Array>} Sipariş detayları
   */
  static async getOrderDetailsBatch(supplierId, orderNumbers, apiKey, apiSecret, batchSize = 5) {
    const results = [];
    const uniqueOrderNumbers = [...new Set(orderNumbers)]; // Duplicate'leri kaldır

    // Önce cache'den kontrol et
    const uncachedOrders = [];
    const cachedResults = [];

    for (const orderNumber of uniqueOrderNumbers) {
      const cacheKey = `${supplierId}_${orderNumber}`;
      if (orderDetailCache.has(cacheKey)) {
        const cached = orderDetailCache.get(cacheKey);
        if (Date.now() - cached.timestamp < ORDER_CACHE_TTL) {
          cachedResults.push(cached.data);
          continue;
        } else {
          orderDetailCache.delete(cacheKey);
        }
      }
      uncachedOrders.push(orderNumber);
    }

    // Cache'den gelen sonuçları ekle
    results.push(...cachedResults);

    // Cache'de olmayan siparişleri batch'ler halinde çek
    for (let i = 0; i < uncachedOrders.length; i += batchSize) {
      const batch = uncachedOrders.slice(i, i + batchSize);
      
      // Batch içindeki siparişleri sıralı çek (rate limiting için)
      for (const orderNumber of batch) {
        try {
          const detail = await this.getOrderDetail(supplierId, orderNumber, apiKey, apiSecret, true);
          if (detail.success) {
            results.push(detail);
          }
        } catch (error) {
          console.error(`❌ Sipariş detayı çekilemedi: ${orderNumber}`, error.message);
        }
      }

      // Batch'ler arasında bekleme kaldırıldı - rate limitler devre dışı
    }

    return results;
  }

  /**
   * Trendyol API bağlantısını test et
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Test sonucu
   */
  static async testConnection(supplierId, apiKey, apiSecret) {
    try {
      // Basit bir sipariş listesi sorgusu ile test et (size=1)
      const response = await this.getOrders(supplierId, apiKey, apiSecret, { size: 1, page: 0 });
      return {
        success: true,
        message: 'Trendyol API bağlantısı başarılı'
      };
    } catch (error) {
      return {
        success: false,
        message: error.error || error.message || 'Trendyol API bağlantısı başarısız',
        error: error
      };
    }
  }

  /**
   * Retry mekanizması ile API isteği gönder
   * @param {Function} requestFn - İstek fonksiyonu
   * @param {number} maxRetries - Maksimum deneme sayısı (varsayılan: 3)
   * @param {number} delay - Retry arası bekleme süresi (ms, varsayılan: 0 - rate limitler kaldırıldı)
   * @returns {Promise<object>} API response
   */
  static async makeRequestWithRetry(requestFn, maxRetries = 3, delay = 0) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // 429 (Rate Limit) veya 403 (Cloudflare) hatası için özel retry mekanizması
        // Rate limitler kaldırıldı - delay yok, anında retry
        if (error.statusCode === 429 || error.statusCode === 403 || error.isCloudflareBlock) {
          if (i < maxRetries - 1) {
            // Delay kaldırıldı - anında retry
            continue; // Tekrar dene
          }
        }
        
        // 401, 404 gibi hatalar için retry yapma (429 ve 403 hariç - bunlar için retry yapıyoruz)
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429 && error.statusCode !== 403) {
          throw error;
        }
        
        // Son deneme değilse tekrar dene (5xx hataları için) - delay kaldırıldı
        if (i < maxRetries - 1 && error.statusCode >= 500) {
          // Delay kaldırıldı - anında retry
          continue;
        } else if (i < maxRetries - 1 && error.statusCode !== 429 && error.statusCode !== 403) {
          // Diğer hatalar için de delay yok - anında retry
          continue;
        }
      }
    }
    throw lastError;
  }

  /**
   * Trendyol'a ürün aktar (v2 API)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} productData - Ürün verisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async createProduct(supplierId, apiKey, apiSecret, productData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('POST', endpoint, apiKey, apiSecret, productData, {}, supplierId),
        3, // maxRetries
        0 // Delay kaldırıldı - rate limitler devre dışı
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API createProduct error:', error);
      throw error;
    }
  }

  /**
   * Trendyol'a toplu ürün aktar (v2 API)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {Array<object>} productsData - Ürün verileri dizisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async createProductsBatch(supplierId, apiKey, apiSecret, productsData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('POST', endpoint, apiKey, apiSecret, productsData, {}, supplierId),
        3, // maxRetries
        0 // Delay kaldırıldı - rate limitler devre dışı
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API createProductsBatch error:', error);
      throw error;
    }
  }

  /**
   * Trendyol'dan ürün listesini çek (Yeni Ürün Filtreleme API - filterProducts)
   * @param {string} sellerId - Trendyol Seller ID (supplierId ile aynı olabilir)
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (page, size, approved, barcode, stockCode, startDate, endDate, dateQueryType, archived, productMainId, onSale, rejected, blacklisted, brandIds)
   * @returns {Promise<object>} Ürün listesi
   * @see https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/urun-filtreleme
   */
  static async filterProducts(sellerId, apiKey, apiSecret, options = {}) {
    try {
      const {
        page = 0,
        size = 10,
        approved = null,
        barcode = null,
        stockCode = null,
        startDate = null,
        endDate = null,
        dateQueryType = null, // CREATED_DATE veya LAST_MODIFIED_DATE
        archived = null,
        productMainId = null,
        onSale = null,
        rejected = null,
        blacklisted = null,
        brandIds = null, // array
        supplierId = null
      } = options;

      // Yeni Ürün Filtreleme API endpoint'i
      const endpoint = `/sellers/${sellerId}/products`;

      const queryParams = {
        page,
        size
      };

      // Filtreleme parametreleri
      if (approved !== null && approved !== undefined) {
        queryParams.approved = approved;
      }
      if (barcode) {
        queryParams.barcode = barcode;
      }
      if (stockCode) {
        queryParams.stockCode = stockCode;
      }
      if (startDate) {
        queryParams.startDate = startDate;
      }
      if (endDate) {
        queryParams.endDate = endDate;
      }
      if (dateQueryType) {
        queryParams.dateQueryType = dateQueryType;
      }
      if (archived !== null && archived !== undefined) {
        queryParams.archived = archived;
      }
      if (productMainId) {
        queryParams.productMainId = productMainId;
      }
      if (onSale !== null && onSale !== undefined) {
        queryParams.onSale = onSale;
      }
      if (rejected !== null && rejected !== undefined) {
        queryParams.rejected = rejected;
      }
      if (blacklisted !== null && blacklisted !== undefined) {
        queryParams.blacklisted = blacklisted;
      }
      if (brandIds && Array.isArray(brandIds) && brandIds.length > 0) {
        // brandIds array olarak gönderilmeli
        queryParams.brandIds = brandIds.join(',');
      }
      if (supplierId) {
        queryParams.supplierId = supplierId;
      }
      
      // Cache kontrolü - sayfa ve filtre parametrelerine göre cache key oluştur
      // Her sayfa ve filtre kombinasyonu için ayrı cache
      const cacheKey = `${sellerId}_filterProducts_${JSON.stringify({
        page,
        size,
        approved,
        barcode,
        stockCode,
        startDate,
        endDate,
        dateQueryType,
        archived,
        productMainId,
        onSale,
        rejected,
        blacklisted,
        brandIds: brandIds ? brandIds.join(',') : null,
        supplierId
      })}`;
      
      // Cache'i devre dışı bırak - ürün listesi sık değişebilir ve kullanıcı tüm ürünleri görmek isteyebilir
      // Cache sorunları nedeniyle geçici olarak kapatıldı
      const USE_CACHE = false;
      
      if (USE_CACHE && productListCache.has(cacheKey)) {
        const cached = productListCache.get(cacheKey);
        if (Date.now() - cached.timestamp < PRODUCT_LIST_CACHE_TTL) {
          console.log('📦 Ürün listesi (filterProducts) cache\'den döndürüldü');
          return cached.data;
        } else {
          productListCache.delete(cacheKey);
        }
      }
      
      // Yeni API base URL kullan (PROD: apigw.trendyol.com)
      const url = `${TRENDYOL_PRODUCT_API_BASE_URL}${endpoint}`;
      const queryString = Object.keys(queryParams)
        .filter(key => queryParams[key] !== null && queryParams[key] !== undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const urlObj = new URL(fullUrl);
      
      // Rate limiting kontrolü (ürün filtreleme: 2000 req/min)
      await this.waitForRateLimit(endpoint);
      
      // User-Agent
      const userAgent = sellerId ? `${sellerId} - SelfIntegration` : 'SelfIntegration';
      
      const headers = {
        'Authorization': this.createAuthHeader(apiKey, apiSecret),
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
      };
      
      const options_https = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: headers
      };

      const response = await new Promise((resolve, reject) => {
        const req = https.request(options_https, (res) => {
          let responseData = '';
          
          const contentEncoding = res.headers['content-encoding'];
          let responseStream = res;
          
          if (contentEncoding === 'gzip') {
            responseStream = res.pipe(zlib.createGunzip());
          } else if (contentEncoding === 'deflate') {
            responseStream = res.pipe(zlib.createInflate());
          }

          responseStream.on('data', (chunk) => {
            responseData += chunk.toString('utf8');
          });
          
          responseStream.on('end', () => {
            try {
              const jsonData = responseData ? JSON.parse(responseData) : {};
              
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({
                  success: true,
                  data: jsonData,
                  statusCode: res.statusCode
                });
              } else {
                reject({
                  success: false,
                  error: jsonData.message || jsonData.error || 'API request failed',
                  statusCode: res.statusCode,
                  data: jsonData
                });
              }
            } catch (error) {
              reject({
                success: false,
                error: 'Invalid JSON response',
                statusCode: res.statusCode,
                rawResponse: responseData.substring(0, 2000)
              });
            }
          });
        });

        req.on('error', (error) => {
          reject({
            success: false,
            error: error.message || 'Network error',
            statusCode: 0
          });
        });

        req.end();
      });
      
      // Cache'e kaydet (başarılı ise) - sadece cache aktifse
      if (USE_CACHE && response.success) {
        productListCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API filterProducts error:', error);
      throw error;
    }
  }

  /**
   * Trendyol'dan ürün listesini çek (Eski Ürün Filtreleme API - deprecated, filterProducts kullanılmalı)
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {object} options - Query options (page, size, approved, barcode, stockCode, startDate, endDate, supplierId, categoryId, brandId, etc.)
   * @returns {Promise<object>} Ürün listesi
   * @see https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/urun-filtreleme
   * @deprecated filterProducts kullanılmalı
   */
  static async getProducts(supplierId, apiKey, apiSecret, options = {}) {
    try {
      const {
        page = 0,
        size = 200,
        approved = null,
        barcode = null,
        stockCode = null,
        startDate = null,
        endDate = null,
        categoryId = null,
        brandId = null,
        productMainId = null,
        onSale = null,
        rejected = null,
        blacklisted = null,
        active = null
      } = options;

      // Trendyol Ürün Filtreleme API endpoint'i
      const endpoint = `/${supplierId}/products`;

      const queryParams = {
        page,
        size
      };

      // Filtreleme parametreleri (Trendyol API dokümantasyonuna göre)
      if (approved !== null && approved !== undefined) {
        queryParams.approved = approved;
      }
      if (barcode) {
        queryParams.barcode = barcode;
      }
      if (stockCode) {
        queryParams.stockCode = stockCode;
      }
      if (startDate) {
        queryParams.startDate = startDate;
      }
      if (endDate) {
        queryParams.endDate = endDate;
      }
      if (categoryId) {
        queryParams.categoryId = categoryId;
      }
      if (brandId) {
        queryParams.brandId = brandId;
      }
      if (productMainId) {
        queryParams.productMainId = productMainId;
      }
      if (onSale !== null && onSale !== undefined) {
        queryParams.onSale = onSale;
      }
      if (rejected !== null && rejected !== undefined) {
        queryParams.rejected = rejected;
      }
      if (blacklisted !== null && blacklisted !== undefined) {
        queryParams.blacklisted = blacklisted;
      }
      if (active !== null && active !== undefined) {
        queryParams.active = active;
      }
      
      // Cache kontrolü (ürün listesi için daha uzun cache süresi)
      const cacheKey = `${supplierId}_products_${JSON.stringify(queryParams)}`;
      if (productListCache.has(cacheKey)) {
        const cached = productListCache.get(cacheKey);
        if (Date.now() - cached.timestamp < PRODUCT_LIST_CACHE_TTL) {
          console.log('📦 Ürün listesi cache\'den döndürüldü');
          return cached.data;
        } else {
          productListCache.delete(cacheKey);
        }
      }
      
      // Rate limiting kaldırıldı - retry mekanizması ile istek gönder (delay yok)
      const maxRetries = 5; // Ürün listesi için 5 retry
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        maxRetries,
        0 // Delay kaldırıldı
      );
      
      // Cache'e kaydet (başarılı ise)
      if (response.success) {
        productListCache.set(cacheKey, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getProducts error:', error);
      throw error;
    }
  }

  /**
   * Trendyol ürün bilgisini güncelle
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {string} barcode - Ürün barcode'u
   * @param {object} productData - Güncellenmiş ürün verisi (Trendyol formatında)
   * @returns {Promise<object>} API response
   */
  static async updateProduct(supplierId, apiKey, apiSecret, barcode, productData) {
    try {
      const endpoint = `/${supplierId}/v2/products`;
      
      // Trendyol ürün güncelleme dokümantasyonuna göre "items" array'i içinde gönderilmeli
      // https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/trendyol-urun-bilgisi-guncelleme
      let updateData;
      
      if (productData.items && Array.isArray(productData.items)) {
        // Zaten items formatında
        updateData = productData;
      } else {
        // Tek ürün güncellemesi - items array'i içine al
        updateData = {
          items: [
            {
              ...productData,
              barcode: barcode
            }
          ]
        };
      }
      
      // Rate limiting için retry mekanizması ile istek gönder
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('PUT', endpoint, apiKey, apiSecret, updateData, {}, supplierId),
        3, // maxRetries
        0 // Delay kaldırıldı - rate limitler devre dışı
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API updateProduct error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Marka Listesi
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Marka listesi
   * Rate Limit: 50 req/min
   */
  static async getBrands(supplierId, apiKey, apiSecret) {
    try {
      const endpoint = `/${supplierId}/brands`;
      
      // Rate limiting kontrolü (50 req/min için özel)
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getBrands error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Kategori Ağacı
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Kategori ağacı
   * Rate Limit: 50 req/min
   */
  static async getCategoryTree(supplierId, apiKey, apiSecret) {
    try {
      const endpoint = `/${supplierId}/categories`;
      
      // Rate limiting kontrolü (50 req/min için özel)
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getCategoryTree error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Kategori Özellikleri
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {number} categoryId - Kategori ID
   * @returns {Promise<object>} Kategori özellikleri
   * Rate Limit: 50 req/min
   */
  static async getCategoryAttributes(supplierId, apiKey, apiSecret, categoryId) {
    try {
      const endpoint = `/${supplierId}/category-attributes`;
      
      const queryParams = {
        categoryId: categoryId
      };
      
      // Rate limiting kontrolü (50 req/min için özel)
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, queryParams, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getCategoryAttributes error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Stok ve Fiyat Güncelleme
   * @param {string} sellerId - Trendyol Seller ID (supplierId)
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {Array<object>} items - Güncellenecek ürünler (barcode, quantity, salePrice, listPrice)
   * @returns {Promise<object>} API response
   * Rate Limit: NO LIMIT
   */
  static async updatePriceAndInventory(sellerId, apiKey, apiSecret, items) {
    try {
      // Yeni API endpoint (inventory API)
      const TRENDYOL_INVENTORY_API_BASE_URL = 'https://apigw.trendyol.com/integration/inventory';
      const endpoint = `/sellers/${sellerId}/products/price-and-inventory`;
      const url = `${TRENDYOL_INVENTORY_API_BASE_URL}${endpoint}`;
      
      const urlObj = new URL(url);
      
      // Rate limiting kontrolü (NO LIMIT ama yine de güvenli bekleme)
      await this.waitForRateLimit(endpoint);
      
      // User-Agent
      const userAgent = sellerId ? `${sellerId} - SelfIntegration` : 'SelfIntegration';
      
      const headers = {
        'Authorization': this.createAuthHeader(apiKey, apiSecret),
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
      };
      
      const requestBody = JSON.stringify({ items });
      
      const options_https = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const response = await new Promise((resolve, reject) => {
        const req = https.request(options_https, (res) => {
          let responseData = '';
          
          const contentEncoding = res.headers['content-encoding'];
          let responseStream = res;
          
          if (contentEncoding === 'gzip') {
            responseStream = res.pipe(zlib.createGunzip());
          } else if (contentEncoding === 'deflate') {
            responseStream = res.pipe(zlib.createInflate());
          }

          responseStream.on('data', (chunk) => {
            responseData += chunk.toString('utf8');
          });
          
          responseStream.on('end', () => {
            try {
              const jsonData = responseData ? JSON.parse(responseData) : {};
              
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({
                  success: true,
                  data: jsonData,
                  statusCode: res.statusCode
                });
              } else {
                reject({
                  success: false,
                  error: jsonData.message || jsonData.error || 'API request failed',
                  statusCode: res.statusCode,
                  data: jsonData
                });
              }
            } catch (error) {
              reject({
                success: false,
                error: 'Invalid JSON response',
                statusCode: res.statusCode,
                rawResponse: responseData.substring(0, 2000)
              });
            }
          });
        });

        req.on('error', (error) => {
          reject({
            success: false,
            error: error.message || 'Network error',
            statusCode: 0
          });
        });

        req.write(requestBody);
        req.end();
      });
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API updatePriceAndInventory error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Ürün Silme
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {string} barcode - Silinecek ürünün barcode'u
   * @returns {Promise<object>} API response
   * Rate Limit: 100 req/min
   */
  static async deleteProduct(supplierId, apiKey, apiSecret, barcode) {
    try {
      const endpoint = `/${supplierId}/products/${barcode}`;
      
      // Rate limiting kontrolü (100 req/min için özel)
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('DELETE', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API deleteProduct error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Toplu İşlem Kontrolü
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @param {string} batchRequestId - Batch request ID
   * @returns {Promise<object>} Batch işlem sonucu
   * Rate Limit: 1000 req/min
   */
  static async getBatchRequestResult(supplierId, apiKey, apiSecret, batchRequestId) {
    try {
      const endpoint = `/${supplierId}/batch-requests/${batchRequestId}`;
      
      // Rate limiting kontrolü
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getBatchRequestResult error:', error);
      throw error;
    }
  }

  /**
   * Trendyol İade ve Sevkiyat Adres Bilgileri
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Adres bilgileri
   * Rate Limit: 1 req/hour
   */
  static async getSuppliersAddresses(supplierId, apiKey, apiSecret) {
    try {
      const endpoint = `/${supplierId}/addresses`;
      
      // Rate limiting kontrolü (1 req/hour - çok dikkatli olmalı)
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        1, // Sadece 1 retry (çünkü 1 req/hour limiti var)
        60000 // 1 dakika delay
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getSuppliersAddresses error:', error);
      throw error;
    }
  }

  /**
   * Trendyol Kargo Şirketleri Listesi
   * @param {string} supplierId - Trendyol Supplier ID
   * @param {string} apiKey - Trendyol API Key
   * @param {string} apiSecret - Trendyol API Secret
   * @returns {Promise<object>} Kargo şirketleri listesi
   */
  static async getProviders(supplierId, apiKey, apiSecret) {
    try {
      const endpoint = `/${supplierId}/providers`;
      
      // Rate limiting kontrolü
      await this.waitForRateLimit(endpoint);
      
      const response = await this.makeRequestWithRetry(
        () => this.makeRequest('GET', endpoint, apiKey, apiSecret, null, {}, supplierId),
        3,
        2000
      );
      
      return response;
    } catch (error) {
      console.error('❌ Trendyol API getProviders error:', error);
      throw error;
    }
  }
}

module.exports = TrendyolAPIService;


