import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../utils/api-service';
import { CartController } from '../controllers/CartController';
import { OrderController } from '../controllers/OrderController';
import { ReviewController } from '../controllers/ReviewController';

export interface NetworkStatus {
  isOnline: boolean;
  queueLength: number;
  lastCheck: Date;
}

export interface OfflineQueueStats {
  cart: number;
  orders: number;
  reviews: number;
  total: number;
}

export const useRealTimeUpdates = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    queueLength: 0,
    lastCheck: new Date()
  });

  const [offlineQueueStats, setOfflineQueueStats] = useState<OfflineQueueStats>({
    cart: 0,
    orders: 0,
    reviews: 0,
    total: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    // Offline modu devre dışı: her zaman online kabul et
    setNetworkStatus({ isOnline: true, queueLength: 0, lastCheck: new Date() });
    return true;
  }, []);

  // Process offline queue when back online
  const processOfflineQueue = useCallback(async () => {
    if (isProcessing) {
      console.log('⏳ Already processing offline queue');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Offline kuyruğu devre dışı
      await apiService.processOfflineQueue();
      await checkNetworkStatus();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, checkNetworkStatus]);

  // Update offline queue stats
  const updateOfflineQueueStats = useCallback(async () => {
    try {
      const status = apiService.getNetworkStatus();
      
      // Get detailed stats from controllers
      // This would need to be implemented in each controller
      const stats: OfflineQueueStats = {
        cart: 0,
        orders: 0,
        reviews: 0,
        total: status.queueLength
      };
      
      setOfflineQueueStats(stats);
    } catch (error) {
      console.error('❌ Error updating offline queue stats:', error);
    }
  }, []);

  // Force online mode (for testing)
  const forceOnlineMode = useCallback(() => {
    apiService.forceOnlineMode();
    checkNetworkStatus();
  }, [checkNetworkStatus]);

  // Clear cache
  const clearCache = useCallback(() => {
    apiService.clearCache();
    console.log('🗑️ Cache cleared');
  }, []);

  // Clear cache by pattern
  const clearCacheByPattern = useCallback((pattern: string) => {
    apiService.clearCacheByPattern(pattern);
  }, []);

  // Effect to check network status periodically
  useEffect(() => {
    const checkStatus = async () => {
      await checkNetworkStatus();
    };

    // Check immediately
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [checkNetworkStatus]);

  // Effect to process offline queue when back online
  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.queueLength > 0) {
      console.log('🌐 Back online, processing offline queue...');
      processOfflineQueue();
    }
  }, [networkStatus.isOnline, networkStatus.queueLength, processOfflineQueue]);

  // Effect to update offline queue stats
  useEffect(() => {
    if (networkStatus.queueLength > 0) {
      updateOfflineQueueStats();
    }
  }, [networkStatus.queueLength, updateOfflineQueueStats]);

  return {
    networkStatus,
    offlineQueueStats,
    isProcessing,
    checkNetworkStatus,
    processOfflineQueue,
    forceOnlineMode,
    clearCache,
    clearCacheByPattern
  };
};
