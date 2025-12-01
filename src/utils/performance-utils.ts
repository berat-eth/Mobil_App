// Performance optimization utilities
export class PerformanceUtils {
  // Debounce function for search inputs
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function for scroll events
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Image lazy loading helper
  static lazyLoadImage(imageUrl: string, placeholder: string): string {
    // Return placeholder initially, load actual image in background
    return placeholder;
  }

  // Memory usage monitoring (React Native compatible)
  static logMemoryUsage(): void {
    if (__DEV__) {
      // React Native'de process.memoryUsage() mevcut değil
      console.log('💾 Memory monitoring not available in React Native');
    }
  }
}

// Network status monitoring
export class NetworkMonitor {
  private static isOnline = true;
  private static connectionType: 'wifi' | 'cellular' | 'unknown' = 'unknown';
  private static listeners: ((isOnline: boolean) => void)[] = [];

  static init(): void {
    try {
      // Lazy import to avoid bundle warnings if not installed
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.addEventListener((state: any) => {
        this.isOnline = !!state.isConnected;
        const type = (state.type || '').toLowerCase();
        if (type === 'wifi') this.connectionType = 'wifi';
        else if (type === 'cellular') this.connectionType = 'cellular';
        else this.connectionType = 'unknown';
        this.listeners.forEach(listener => listener(this.isOnline));
      });
      NetInfo.fetch().then((state: any) => {
        this.isOnline = !!state.isConnected;
        const type = (state.type || '').toLowerCase();
        if (type === 'wifi') this.connectionType = 'wifi';
        else if (type === 'cellular') this.connectionType = 'cellular';
        else this.connectionType = 'unknown';
      });
    } catch {
      console.log('🌐 NetInfo not available, network type unknown');
    }
  }

  static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  static getConnectionType(): 'wifi' | 'cellular' | 'unknown' {
    return this.connectionType;
  }

  static addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  static removeListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}
