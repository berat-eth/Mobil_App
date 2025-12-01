import { apiService, ApiResponse } from '../utils/api-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FlashDealProduct {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  description?: string;
  stock?: number;
}

export interface FlashDeal {
  id: number;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  products: FlashDealProduct[];
}

const CACHE_KEY = 'flash_deals_cache';
const CACHE_TIMESTAMP_KEY = 'flash_deals_cache_timestamp';
const CACHE_DURATION = 4 * 60 * 1000; // 4 dakika cache süresi

interface CacheData {
  data: FlashDeal[];
  timestamp: number;
}

export class FlashDealService {
  // Cache'den veri oku
  private static async getFromCache(): Promise<FlashDeal[] | null> {
    try {
      const [cachedData, timestampStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY)
      ]);

      if (!cachedData || !timestampStr) {
        return null;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const age = now - timestamp;

      // Cache süresi dolmuşsa null döndür
      if (age > CACHE_DURATION) {
        console.log('⏰ Flash deals cache expired, age:', Math.round(age / 1000), 'seconds');
        await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
        return null;
      }

      // Cache geçerli, veriyi parse et ve döndür
      const parsed: CacheData = JSON.parse(cachedData);
      console.log('✅ Flash deals loaded from cache, age:', Math.round(age / 1000), 'seconds');
      return parsed.data;
    } catch (error) {
      console.error('❌ Cache read error:', error);
      return null;
    }
  }

  // Cache'e veri yaz
  private static async saveToCache(data: FlashDeal[]): Promise<void> {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.multiSet([
        [CACHE_KEY, JSON.stringify(cacheData)],
        [CACHE_TIMESTAMP_KEY, cacheData.timestamp.toString()]
      ]);
      console.log('💾 Flash deals saved to cache');
    } catch (error) {
      console.error('❌ Cache write error:', error);
    }
  }

  static async getActiveFlashDeals(forceRefresh: boolean = false): Promise<FlashDeal[]> {
    try {
      // Eğer force refresh değilse, önce cache'den kontrol et
      if (!forceRefresh) {
        const cached = await this.getFromCache();
        if (cached !== null) {
          return cached;
        }
      }

      // Cache'de yok veya süresi dolmuş, API'den çek
      console.log('🔄 Calling /api/flash-deals endpoint...');
      const res: ApiResponse<FlashDeal[]> = await apiService.get('/flash-deals');
      console.log('📦 Flash deals API response:', {
        success: res?.success,
        hasData: !!res?.data,
        dataIsArray: Array.isArray(res?.data),
        dataLength: Array.isArray(res?.data) ? res.data.length : 'N/A',
        error: res?.error,
        message: res?.message
      });
      
      // Hata durumunda detaylı log
      if (!res || !res.success) {
        console.error('❌ Flash deals API error:', {
          success: res?.success,
          error: res?.error,
          message: res?.message,
          parseError: (res as any)?.parseError
        });
        // Hata durumunda cache'den döndürmeyi dene
        const cached = await this.getFromCache();
        if (cached !== null && cached.length > 0) {
          console.log('⚠️ Using cached flash deals due to API error');
          return cached;
        }
        return [];
      }
      
      let deals: FlashDeal[] = [];
      
      // API response format: { success: true, data: [...] }
      if (res && res.success && res.data) {
        // Eğer res.data bir array ise direkt döndür
        if (Array.isArray(res.data)) {
          console.log('✅ Flash deals loaded:', res.data.length, 'deals');
          if (res.data.length > 0) {
            console.log('📦 First deal:', {
              id: res.data[0].id,
              name: res.data[0].name,
              productsCount: res.data[0].products?.length || 0
            });
          }
          deals = res.data as FlashDeal[];
        }
        // Eğer res.data içinde data varsa (nested)
        else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
          console.log('✅ Flash deals loaded (nested):', (res.data as any).data.length);
          deals = (res.data as any).data as FlashDeal[];
        } else {
          // Beklenmeyen format
          console.warn('⚠️ Flash deals data formatı beklenmedik:', {
            success: res?.success,
            hasData: !!res?.data,
            dataType: typeof res?.data,
            isArray: Array.isArray(res.data),
            dataKeys: res.data && typeof res.data === 'object' ? Object.keys(res.data) : 'N/A'
          });
        }
      } else {
        console.warn('⚠️ Flash deals response has no data:', {
          success: res?.success,
          hasData: !!res?.data,
          dataType: typeof res?.data
        });
      }

      // Cache'e kaydet
      if (deals.length > 0) {
        await this.saveToCache(deals);
      } else {
        // Data yoksa cache'den döndürmeyi dene
        const cached = await this.getFromCache();
        if (cached !== null && cached.length > 0) {
          console.log('⚠️ No deals from API, using cached flash deals');
          return cached;
        }
      }

      return deals;
    } catch (error: any) {
      console.error('❌ Flash deal yükleme hatası:', error?.message || error);
      
      // Hata durumunda cache'den döndürmeyi dene
      const cached = await this.getFromCache();
      if (cached !== null && cached.length > 0) {
        console.log('⚠️ Using cached flash deals due to API error');
        return cached;
      }
      
      return [];
    }
  }
}

export default FlashDealService;


