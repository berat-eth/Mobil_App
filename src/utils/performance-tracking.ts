import { Platform } from 'react-native';
import { sendTrackingEvent } from './device-tracking';

/**
 * Performans metriklerini topla ve gönder
 */
export class PerformanceTracker {
  private static pageLoadTimes: Map<string, number> = new Map();
  private static apiResponseTimes: Map<string, number> = new Map();
  private static errorCount: number = 0;

  /**
   * Sayfa yükleme süresini kaydet
   */
  static trackPageLoad(screenName: string, loadTime: number) {
    this.pageLoadTimes.set(screenName, loadTime);
    
    // Event gönder
    sendTrackingEvent('performance', {
      screenName,
      pageLoadTime: loadTime,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    }).catch(() => {
      // Silent fail
    });
  }

  /**
   * API yanıt süresini kaydet
   */
  static trackApiResponse(endpoint: string, responseTime: number, success: boolean = true) {
    this.apiResponseTimes.set(endpoint, responseTime);
    
    // Event gönder (batch olarak gönderilebilir)
    sendTrackingEvent('performance', {
      apiEndpoint: endpoint,
      apiResponseTime: responseTime,
      success,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    }).catch(() => {
      // Silent fail
    });
  }

  /**
   * Hata kaydet
   */
  static trackError(error: Error, screenName?: string, context?: any) {
    this.errorCount++;
    
    sendTrackingEvent('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      screenName: screenName || 'unknown',
      context: context || {},
      platform: Platform.OS,
      platformVersion: Platform.Version?.toString(),
      timestamp: new Date().toISOString()
    }).catch(() => {
      // Silent fail
    });
  }

  /**
   * Crash kaydet
   */
  static trackCrash(error: Error, screenName?: string) {
    sendTrackingEvent('crash', {
      errorMessage: error.message,
      errorStack: error.stack,
      screenName: screenName || 'unknown',
      platform: Platform.OS,
      platformVersion: Platform.Version?.toString(),
      timestamp: new Date().toISOString()
    }).catch(() => {
      // Silent fail
    });
  }

  /**
   * Network durumunu kaydet
   */
  static trackNetworkStatus(networkType: string, isConnected: boolean) {
    sendTrackingEvent('network_status', {
      networkType,
      isConnected,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    }).catch(() => {
      // Silent fail
    });
  }

  /**
   * Ortalama sayfa yükleme süresini al
   */
  static getAveragePageLoadTime(): number {
    const times = Array.from(this.pageLoadTimes.values());
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Ortalama API yanıt süresini al
   */
  static getAverageApiResponseTime(): number {
    const times = Array.from(this.apiResponseTimes.values());
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Hata sayısını al
   */
  static getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Metrikleri temizle
   */
  static clearMetrics() {
    this.pageLoadTimes.clear();
    this.apiResponseTimes.clear();
    this.errorCount = 0;
  }
}

