import { useEffect, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sendTrackingEvent, startTrackingSession, endTrackingSession } from '../utils/device-tracking';
import { PerformanceTracker } from '../utils/performance-tracking';
import { useAppContext } from '../contexts/AppContext';

interface UseAnalyticsOptions {
  screenName: string;
  trackScroll?: boolean;
  trackPerformance?: boolean;
  trackClicks?: boolean;
}

/**
 * Analytics hook - Ekran bazlı tracking
 */
export function useAnalytics(options: UseAnalyticsOptions) {
  const { screenName, trackScroll: trackScrollEnabled = true, trackPerformance = true, trackClicks = true } = options;
  const navigation = useNavigation();
  const { user } = useAppContext();
  const sessionIdRef = useRef<string | null>(null);
  const screenStartTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const pageViewCountRef = useRef<number>(0);
  const clickCountRef = useRef<number>(0);

  // Session başlat
  useEffect(() => {
    const startSession = async () => {
      const sessionId = await startTrackingSession(
        user?.id || null,
        {
          screenName,
          platform: 'mobile'
        }
      );
      sessionIdRef.current = sessionId;
    };

    startSession();

    return () => {
      // Session bitir
      if (sessionIdRef.current) {
        const duration = Math.floor((Date.now() - screenStartTimeRef.current) / 1000);
        endTrackingSession(
          sessionIdRef.current,
          duration,
          pageViewCountRef.current,
          scrollDepthRef.current,
          {
            clickCount: clickCountRef.current
          }
        );
      }
    };
  }, []);

  // Ekran görüntüleme
  useFocusEffect(
    useCallback(() => {
      const startTime = Date.now();
      screenStartTimeRef.current = startTime;
      pageViewCountRef.current++;

      // Screen view event
      sendTrackingEvent('screen_view', {
        screenName,
        timestamp: new Date().toISOString()
      }, user?.id || null, sessionIdRef.current || null);

      // Performans tracking
      if (trackPerformance) {
        // Sayfa yükleme süresini ölç (basit bir yaklaşım)
        setTimeout(() => {
          const loadTime = Date.now() - startTime;
          PerformanceTracker.trackPageLoad(screenName, loadTime);
        }, 100);
      }

      return () => {
        // Ekrandan çıkış
        const timeOnScreen = Math.floor((Date.now() - startTime) / 1000);
        sendTrackingEvent('screen_exit', {
          screenName,
          timeOnScreen,
          scrollDepth: scrollDepthRef.current,
          timestamp: new Date().toISOString()
        }, user?.id || null, sessionIdRef.current || null);
      };
    }, [screenName, user?.id, trackPerformance])
  );

  /**
   * Tıklama eventi kaydet
   */
  const trackClick = useCallback((elementName: string, elementType: string = 'button', metadata?: any) => {
    if (!trackClicks) return;

    clickCountRef.current++;
    sendTrackingEvent('button_click', {
      screenName,
      elementName,
      elementType,
      clickElement: elementName,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id, trackClicks]);

  /**
   * Hata eventi kaydet
   */
  const trackError = useCallback((error: string, errorType?: string, metadata?: any) => {
    sendTrackingEvent('error_event', {
      screenName,
      error,
      errorMessage: error,
      errorType,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Scroll derinliği kaydet
   */
  const trackScroll = useCallback((scrollDepth: number, maxScroll: number) => {
    if (!trackScrollEnabled) return;

    const depthPercentage = maxScroll > 0 ? (scrollDepth / maxScroll) * 100 : 0;
    scrollDepthRef.current = Math.max(scrollDepthRef.current, depthPercentage);

    // Her %25'te bir event gönder
    if (depthPercentage >= 25 && depthPercentage < 50 && scrollDepthRef.current < 25) {
      sendTrackingEvent('scroll', {
        screenName,
        scrollDepth: depthPercentage,
        timestamp: new Date().toISOString()
      }, user?.id || null, sessionIdRef.current || null);
    } else if (depthPercentage >= 50 && depthPercentage < 75 && scrollDepthRef.current < 50) {
      sendTrackingEvent('scroll', {
        screenName,
        scrollDepth: depthPercentage,
        timestamp: new Date().toISOString()
      }, user?.id || null, sessionIdRef.current || null);
    } else if (depthPercentage >= 75 && depthPercentage < 100 && scrollDepthRef.current < 75) {
      sendTrackingEvent('scroll', {
        screenName,
        scrollDepth: depthPercentage,
        timestamp: new Date().toISOString()
      }, user?.id || null, sessionIdRef.current || null);
    } else if (depthPercentage >= 100 && scrollDepthRef.current < 100) {
      sendTrackingEvent('scroll', {
        screenName,
        scrollDepth: depthPercentage,
        timestamp: new Date().toISOString()
      }, user?.id || null, sessionIdRef.current || null);
    }
  }, [screenName, user?.id, trackScrollEnabled]);

  /**
   * Ürün görüntüleme kaydet
   */
  const trackProductView = useCallback((productId: number, productName: string, metadata?: any) => {
    sendTrackingEvent('product_view', {
      screenName,
      productId,
      productName,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Sepete ekleme kaydet
   */
  const trackAddToCart = useCallback((productId: number, quantity: number, price: number, metadata?: any) => {
    sendTrackingEvent('add_to_cart', {
      screenName,
      productId,
      quantity,
      price,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Arama kaydet
   */
  const trackSearch = useCallback((query: string, resultCount?: number) => {
    sendTrackingEvent('search', {
      screenName,
      searchQuery: query,
      resultCount: resultCount || 0,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Filtreleme kaydet
   */
  const trackFilter = useCallback((filterType: string, filterValue: any) => {
    sendTrackingEvent('filter_used', {
      screenName,
      filterType,
      filterValue,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Sıralama kaydet
   */
  const trackSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    sendTrackingEvent('sort_used', {
      screenName,
      sortBy,
      sortOrder,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Karşılaştırma kaydet
   */
  const trackCompare = useCallback((productIds: number[]) => {
    sendTrackingEvent('compare_used', {
      screenName,
      productIds,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Navigation kaydet
   */
  const trackNavigation = useCallback((fromScreen: string, toScreen: string) => {
    sendTrackingEvent('navigation', {
      screenName,
      fromScreen,
      toScreen,
      navigationPath: `${fromScreen} -> ${toScreen}`,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Checkout başlatma kaydet
   */
  const trackCheckoutStart = useCallback((cartValue: number, itemCount: number) => {
    sendTrackingEvent('checkout_start', {
      screenName,
      cartValue,
      itemCount,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Satın alma kaydet
   */
  const trackPurchase = useCallback((orderId: number, totalAmount: number, itemCount: number) => {
    sendTrackingEvent('purchase', {
      screenName,
      orderId,
      totalAmount,
      itemCount,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Favorilere ekleme kaydet
   */
  const trackFavorite = useCallback((productId: number, action: 'add' | 'remove') => {
    sendTrackingEvent('favorite', {
      screenName,
      productId,
      action,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Paylaşım kaydet
   */
  const trackShare = useCallback((productId: number, shareMethod: string) => {
    sendTrackingEvent('share', {
      screenName,
      productId,
      shareMethod,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Yorum kaydet
   */
  const trackReview = useCallback((productId: number, rating: number, hasComment: boolean) => {
    sendTrackingEvent('review', {
      screenName,
      productId,
      rating,
      hasComment,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Beğeni kaydet
   */
  const trackLike = useCallback((productId: number, action: 'like' | 'unlike') => {
    sendTrackingEvent('like', {
      screenName,
      productId,
      action,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Fiyat takibi kaydet
   */
  const trackPriceTrack = useCallback((productId: number, currentPrice: number) => {
    sendTrackingEvent('price_track', {
      screenName,
      productId,
      currentPrice,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  /**
   * Referans kodu kullanımı kaydet
   */
  const trackReferralUsed = useCallback((referralCode: string) => {
    sendTrackingEvent('referral_used', {
      screenName,
      referralCode,
      timestamp: new Date().toISOString()
    }, user?.id || null, sessionIdRef.current || null);
  }, [screenName, user?.id]);

  return {
    trackClick,
    trackScroll,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackSearch,
    trackError,
    trackFilter,
    trackSort,
    trackCompare,
    trackNavigation,
    trackCheckoutStart,
    trackFavorite,
    trackShare,
    trackReview,
    trackLike,
    trackPriceTrack,
    trackReferralUsed
  };
}

