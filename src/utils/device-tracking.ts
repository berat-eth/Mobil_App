import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { generateSecureDeviceId } from './crypto-utils';
import { getApiKey as getStoredApiKey, getTenantId as getStoredTenantId } from '../services/AuthKeyStore';

const DEVICE_ID_KEY = 'device_id';

/**
 * DeviceId'yi al veya oluştur
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // Önce AsyncStorage'dan al
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Yeni deviceId oluştur
      deviceId = generateSecureDeviceId(Platform.OS);
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('✅ Yeni deviceId oluşturuldu:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ DeviceId getirme hatası:', error);
    // Fallback: geçici deviceId oluştur
    return generateSecureDeviceId(Platform.OS);
  }
}

/**
 * API base URL'i al (lazy loading ile circular dependency'den kaçın)
 */
function getApiBaseUrl(): string {
  try {
    // Önce process.env'den oku
    const fromEnv = (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL;
    if (fromEnv) return String(fromEnv);
    
    // Sonra expo-constants'ı optional olarak dene (güvenli require)
    try {
      // Dynamic require ile modül yükleme - undefined kontrolü ile
      let ConstantsModule;
      try {
        ConstantsModule = require('expo-constants');
      } catch (requireError) {
        // Modül yüklenemezse atla
        ConstantsModule = null;
      }
      
      // Undefined veya null kontrolü
      if (!ConstantsModule || ConstantsModule === undefined || ConstantsModule === null) {
        // Modül yüklenemedi, sessizce devam et
      } else if (typeof ConstantsModule === 'object') {
        // Default export kontrolü
        const Constants = ConstantsModule.default || ConstantsModule;
        if (Constants && typeof Constants === 'object') {
          const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
          const fromExtra = extra?.EXPO_PUBLIC_API_BASE_URL;
          if (fromExtra) return String(fromExtra);
        }
      }
    } catch (constantsError) {
      // expo-constants yüklenemezse sessizce devam et
    }
    
    // Fallback: default URL
    return 'https://api.huglutekstil.com/api';
  } catch {
    return 'https://api.huglutekstil.com/api';
  }
}

/**
 * API key ve tenant ID'yi al (api-service.ts ile aynı mantık)
 * Runtime'da değerleri alarak circular dependency'den kaçınıyoruz
 */
async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  let apiKeyToUse: string | null = null;
  let tenantIdToUse: string | null = null;

  // Runtime'da config değerlerini al (expo-constants olmadan)
  try {
    // Önce process.env'den oku
    const singleTenant = String(((process as any)?.env?.EXPO_PUBLIC_SINGLE_TENANT) || 'true') === 'true';
    
    if (singleTenant) {
      apiKeyToUse = String(((process as any)?.env?.EXPO_PUBLIC_TENANT_API_KEY) || '') || null;
      tenantIdToUse = String(((process as any)?.env?.EXPO_PUBLIC_TENANT_ID) || '1') || null;
    }
    
    // Eğer process.env'de yoksa, expo-constants'ı optional olarak dene (güvenli require)
    if (!apiKeyToUse || !tenantIdToUse) {
      try {
        // Dynamic require ile modül yükleme - undefined kontrolü ile
        let ConstantsModule;
        try {
          ConstantsModule = require('expo-constants');
        } catch (requireError) {
          // Modül yüklenemezse atla
          ConstantsModule = null;
        }
        
        // Undefined veya null kontrolü
        if (ConstantsModule && ConstantsModule !== undefined && ConstantsModule !== null && typeof ConstantsModule === 'object') {
          // Default export kontrolü
          const Constants = ConstantsModule.default || ConstantsModule;
          if (Constants && typeof Constants === 'object') {
            const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
            
            if (singleTenant) {
              if (!apiKeyToUse) {
                apiKeyToUse = String(extra?.EXPO_PUBLIC_TENANT_API_KEY || '') || null;
              }
              if (!tenantIdToUse) {
                tenantIdToUse = String(extra?.EXPO_PUBLIC_TENANT_ID || '1') || null;
              }
            }
          }
        }
      } catch (constantsError) {
        // expo-constants yüklenemezse sessizce devam et
      }
    }
  } catch (error) {
    // Config okuma hatası - sessizce devam et
  }

  // Depodan okunan değerleri tercih et
  try {
    const [storedKey, storedTenant] = await Promise.all([
      getStoredApiKey(),
      getStoredTenantId()
    ]);
    if (storedKey) apiKeyToUse = storedKey;
    if (storedTenant) tenantIdToUse = storedTenant;
  } catch {}

  if (tenantIdToUse) {
    headers['X-Tenant-Id'] = tenantIdToUse;
    headers['x-tenant-id'] = tenantIdToUse;
  }

  if (apiKeyToUse) {
    headers['X-API-Key'] = apiKeyToUse;
  }

  return headers;
}

/**
 * Event gönder (hem logged-in hem anonymous)
 * 
 * ÖNEMLİ: Login yaptığında userId zorunlu olmalı
 * sessionId her zaman zorunlu
 */
export async function sendTrackingEvent(
  eventType: string,
  eventData: any,
  userId: number | null = null,
  sessionId: string | null = null
): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    
    // sessionId zorunlu - yoksa oluştur veya mevcut session'ı al
    let finalSessionId = sessionId;
    if (!finalSessionId) {
      try {
        const storedSessionId = await AsyncStorage.getItem('current_session_id');
        if (storedSessionId) {
          finalSessionId = storedSessionId;
        } else {
          // Yeni session oluştur
          finalSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('current_session_id', finalSessionId);
        }
      } catch (e) {
        // AsyncStorage hatası durumunda geçici session oluştur
        finalSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }
    
    // Geçerli eventType kontrolü
    const validEventTypes = [
      'screen_view', 'screen_exit', 'performance',
      'button_click', 'product_view', 'add_to_cart', 
      'purchase', 'search_query', 'error_event'
    ];
    
    if (!validEventTypes.includes(eventType)) {
      console.warn(`⚠️ Geçersiz eventType: ${eventType}. Geçerli tipler: ${validEventTypes.join(', ')}`);
    }
    
    // eventData'yı zenginleştir
    const enrichedEventData = {
      ...eventData,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version?.toString(),
      // eventType'a göre özel alanlar
      ...(eventType === 'product_view' && eventData.productId ? { productId: eventData.productId } : {}),
      ...(eventType === 'add_to_cart' && eventData.productId ? { productId: eventData.productId } : {}),
      ...(eventType === 'purchase' && eventData.orderId ? { orderId: eventData.orderId, amount: eventData.amount } : {}),
      ...(eventType === 'search_query' && eventData.query ? { searchQuery: eventData.query } : {}),
      ...(eventType === 'button_click' && eventData.elementName ? { clickElement: eventData.elementName } : {}),
      ...(eventType === 'error_event' && eventData.error ? { errorMessage: eventData.error } : {}),
      ...(eventType === 'screen_exit' && eventData.timeOnScreen ? { timeOnScreen: eventData.timeOnScreen } : {}),
      ...(eventType === 'performance' && eventData.responseTime ? { responseTime: eventData.responseTime } : {})
    };
    
    const payload = {
      userId: userId || null, // Login yaptığında zorunlu
      deviceId,
      eventType,
      screenName: eventData.screenName || null,
      eventData: enrichedEventData,
      sessionId: finalSessionId // Zorunlu
    };

    // Non-blocking fetch - main thread'i bloklamaz
    const apiUrl = getApiBaseUrl();
    const headers = await getApiHeaders();
    
    fetch(`${apiUrl}/user-data/behavior/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }).catch(error => {
      // Silent fail - tracking hatası kullanıcıyı etkilememeli
      console.error('Tracking event gönderilemedi:', error);
    });

    return true;
  } catch (error) {
    console.error('❌ Tracking event hatası:', error);
    return false;
  }
}

/**
 * Session başlat
 */
export async function startTrackingSession(
  userId: number | null = null,
  metadata: any = {}
): Promise<string | null> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      userId: userId || null,
      deviceId,
      sessionId,
      metadata
    };

    const apiUrl = getApiBaseUrl();
    const headers = await getApiHeaders();
    
    await fetch(`${apiUrl}/user-data/behavior/session/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }).catch(error => {
      console.error('Session start hatası:', error);
    });

    // SessionId'yi AsyncStorage'a kaydet
    await AsyncStorage.setItem('current_session_id', sessionId);
    
    return sessionId;
  } catch (error) {
    console.error('❌ Session start hatası:', error);
    return null;
  }
}

/**
 * Session bitir
 */
export async function endTrackingSession(
  sessionId: string | null,
  duration: number = 0,
  pageCount: number = 0,
  scrollDepth: number = 0,
  metadata: any = {}
): Promise<boolean> {
  try {
    if (!sessionId) {
      sessionId = await AsyncStorage.getItem('current_session_id');
    }

    if (!sessionId) {
      return false;
    }

    const payload = {
      sessionId,
      duration,
      pageCount,
      scrollDepth,
      metadata
    };

    const apiUrl = getApiBaseUrl();
    const headers = await getApiHeaders();
    
    await fetch(`${apiUrl}/user-data/behavior/session/end`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }).catch(error => {
      console.error('Session end hatası:', error);
    });

    // SessionId'yi temizle
    await AsyncStorage.removeItem('current_session_id');
    
    return true;
  } catch (error) {
    console.error('❌ Session end hatası:', error);
    return false;
  }
}

/**
 * Device'ı user'a bağla (login sonrası)
 */
export async function linkDeviceToUser(userId: number): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const apiUrl = getApiBaseUrl();
    const headers = await getApiHeaders();
    
    const payload = {
      deviceId,
      userId
    };

    // Timeout kontrolü için AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    try {
      const response = await fetch(`${apiUrl}/user-data/behavior/link-device`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Device linking HTTP hatası: ${response.status} - ${errorText}`);
        return false;
      }

      const result = await response.json();
      return result.success === true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Device linking timeout (10s)');
        return false;
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Device linking hatası:', error);
    return false;
  }
}

