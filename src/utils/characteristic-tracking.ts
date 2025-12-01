import { sendTrackingEvent } from './device-tracking';
import { Platform } from 'react-native';

/**
 * Karakteristik veri toplama için tracking fonksiyonları
 */

/**
 * Tercih verilerini kaydet (renk, stil, kategori)
 */
export async function trackPreference(
  preferenceType: 'color' | 'style' | 'category' | 'brand',
  value: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('preference', {
    preferenceType,
    value,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Zaman bazlı davranış kaydet
 */
export async function trackTimeBasedBehavior(
  behaviorType: 'active_hour' | 'shopping_time',
  hour: number,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('time_behavior', {
    behaviorType,
    hour,
    dayOfWeek: new Date().getDay(),
    isWeekend: [0, 6].includes(new Date().getDay()),
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Karar verme süreci kaydet
 */
export async function trackDecisionProcess(
  productId: number,
  viewCount: number,
  timeSpent: number,
  comparisonMade: boolean,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('decision_process', {
    productId,
    viewCount,
    timeSpent,
    comparisonMade,
    decisionSpeed: timeSpent < 60 ? 'fast' : timeSpent < 300 ? 'medium' : 'slow',
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Fiyat davranışı kaydet
 */
export async function trackPriceBehavior(
  behaviorType: 'view_price_range' | 'use_discount_code' | 'track_price' | 'price_drop_notification',
  productId?: number,
  price?: number,
  discountCode?: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('price_behavior', {
    behaviorType,
    productId,
    price,
    discountCode,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Sosyal davranış kaydet
 */
export async function trackSocialBehavior(
  behaviorType: 'share' | 'review' | 'like' | 'referral',
  productId?: number,
  metadata?: any,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('social_behavior', {
    behaviorType,
    productId,
    metadata: metadata || {},
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Cihaz ve uygulama tercihleri kaydet
 */
export async function trackDevicePreferences(
  darkMode: boolean,
  notificationsEnabled: boolean,
  appVersion: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('device_preferences', {
    darkMode,
    notificationsEnabled,
    appVersion,
    platform: Platform.OS,
    platformVersion: Platform.Version?.toString(),
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Coğrafi davranış kaydet (izin verilirse)
 */
export async function trackGeographicBehavior(
  city?: string,
  region?: string,
  deliveryPreference?: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('geographic_behavior', {
    city,
    region,
    deliveryPreference,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * Etkileşim seviyesi kaydet
 */
export async function trackInteractionLevel(
  featureUsed: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('interaction', {
    featureUsed,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

/**
 * İlgi alanları kaydet
 */
export async function trackInterest(
  interestType: 'category_view' | 'search_term' | 'content_type' | 'campaign_subscription',
  value: string,
  userId: number | null = null,
  sessionId: string | null = null
) {
  await sendTrackingEvent('interest', {
    interestType,
    value,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  }, userId, sessionId);
}

