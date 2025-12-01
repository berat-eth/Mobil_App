import AsyncStorage from '@react-native-async-storage/async-storage';

type JsonValue = any;

interface CacheEntry<T = JsonValue> {
  v: T;
  e: number; // expiry epoch ms
}

// ✅ OPTIMIZASYON: Memory cache layer
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // Maximum number of entries in memory cache

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.e) {
      // expired, remove
      this.cache.delete(key);
      return null;
    }
    return entry.v as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    // LRU: If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    const entry: CacheEntry<T> = { v: value, e: Date.now() + Math.max(0, ttlMs) };
    this.cache.set(key, entry);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

export class CacheService {
  // ✅ OPTIMIZASYON: Memory cache + AsyncStorage hybrid
  static async get<T = JsonValue>(key: string): Promise<T | null> {
    // First check memory cache (fastest)
    const memoryCached = memoryCache.get<T>(key);
    if (memoryCached !== null) {
      return memoryCached;
    }

    // Then check AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (!parsed || typeof parsed.e !== 'number') return null;
      if (Date.now() > parsed.e) {
        // expired, remove
        AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
      // Populate memory cache from AsyncStorage
      memoryCache.set(key, parsed.v, parsed.e - Date.now());
      return parsed.v;
    } catch {
      return null;
    }
  }

  static async set<T = JsonValue>(key: string, value: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = { v: value, e: Date.now() + Math.max(0, ttlMs) };
    // Set in memory cache (immediate)
    memoryCache.set(key, value, ttlMs);
    // Set in AsyncStorage (async, non-blocking)
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch {}
  }

  static async del(key: string): Promise<void> {
    // Remove from both memory and AsyncStorage
    memoryCache.delete(key);
    try { await AsyncStorage.removeItem(key); } catch {}
  }

  static async remove(key: string): Promise<void> {
    return this.del(key);
  }

  static async clearPattern(pattern: string): Promise<void> {
    // Clear from memory cache
    memoryCache.clearPattern(pattern);
    // Clear from AsyncStorage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(k => k.includes(pattern));
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }
    } catch {}
  }

  // ✅ OPTIMIZASYON: Clear all memory cache
  static clearMemoryCache(): void {
    memoryCache.clear();
  }

  static async withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await CacheService.get<T>(key);
    if (cached !== null && cached !== undefined) return cached as T;
    const fresh = await fetcher();
    // Do not cache null/undefined to avoid poisoning
    if (fresh !== undefined && fresh !== null) {
      CacheService.set(key, fresh as any, ttlMs).catch(() => {});
    }
    return fresh;
  }
}

export const CacheTTL = {
  SHORT: 3 * 60 * 1000,          // 3 minutes (1 → 3)
  MEDIUM: 10 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  XLONG: 2 * 60 * 60 * 1000, // 2 hours
};


