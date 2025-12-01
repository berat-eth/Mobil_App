import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';

/**
 * Image caching utility for managing disk and memory cache
 * Provides cache management, invalidation, and size limits
 */

const CACHE_DIR = `${FileSystem.cacheDirectory}image-cache/`;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  uri: string;
  localPath: string;
  size: number;
  timestamp: number;
}

class ImageCacheManager {
  private memoryCache: Map<string, string> = new Map();
  private maxMemoryCacheSize = 50; // Max 50 images in memory

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing image cache:', error);
    }
  }

  /**
   * Get cached image path or download and cache
   */
  async getCachedImage(uri: string): Promise<string> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(uri)) {
        return this.memoryCache.get(uri)!;
      }

      // Check disk cache
      const filename = this.getFilename(uri);
      const localPath = `${CACHE_DIR}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        // Check if cache is still valid
        const stats = await FileSystem.getInfoAsync(localPath);
        if (stats.exists && 'modificationTime' in stats) {
          const age = Date.now() - (stats.modificationTime || 0) * 1000;
          if (age < MAX_CACHE_AGE) {
            // Add to memory cache
            this.addToMemoryCache(uri, localPath);
            return localPath;
          } else {
            // Cache expired, delete it
            await FileSystem.deleteAsync(localPath, { idempotent: true });
          }
        }
      }

      // Download and cache
      const downloadResult = await FileSystem.downloadAsync(uri, localPath);
      if (downloadResult.uri) {
        this.addToMemoryCache(uri, downloadResult.uri);
        return downloadResult.uri;
      }

      return uri; // Fallback to original URI
    } catch (error) {
      console.error('Error getting cached image:', error);
      return uri; // Fallback to original URI
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(uris: string[]): Promise<void> {
    try {
      await Promise.allSettled(
        uris.map(uri => this.getCachedImage(uri))
      );
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      this.memoryCache.clear();
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await this.initialize();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const now = Date.now();

      for (const file of files) {
        const filePath = `${CACHE_DIR}${file}`;
        const stats = await FileSystem.getInfoAsync(filePath);
        
        if (stats.exists && 'modificationTime' in stats) {
          const age = now - (stats.modificationTime || 0) * 1000;
          if (age > MAX_CACHE_AGE) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${CACHE_DIR}${file}`;
        const stats = await FileSystem.getInfoAsync(filePath);
        if (stats.exists && 'size' in stats) {
          totalSize += stats.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for specific URI
   */
  async invalidateCache(uri: string): Promise<void> {
    try {
      this.memoryCache.delete(uri);
      const filename = this.getFilename(uri);
      const localPath = `${CACHE_DIR}${filename}`;
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Get filename from URI
   */
  private getFilename(uri: string): string {
    try {
      const url = new URL(uri);
      const pathParts = url.pathname.split('/');
      const filename = pathParts[pathParts.length - 1] || 'image';
      return encodeURIComponent(filename);
    } catch {
      // Fallback for non-URL URIs
      return encodeURIComponent(uri.split('/').pop() || 'image');
    }
  }

  /**
   * Add to memory cache with size limit
   */
  private addToMemoryCache(uri: string, localPath: string): void {
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove oldest entry (FIFO)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(uri, localPath);
  }
}

// Singleton instance
export const imageCache = new ImageCacheManager();

// Initialize on import
imageCache.initialize().catch(() => {});

