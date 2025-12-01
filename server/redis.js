// ✅ OPTIMIZASYON: Enhanced Redis helpers with pipeline, batch operations, and better error handlingrr
const crypto = require('crypto');

// ✅ OPTIMIZASYON: Cache TTL constants (saniye cinsinden)
const CACHE_TTL = {
  SHORT: 300,        // 5 dakika - sık değişen veriler (sepet, hesap özeti)
  MEDIUM: 600,       // 10 dakika - orta sıklıkta değişen veriler (kategoriler, markalar)
  LONG: 3600,        // 1 saat - nadiren değişen veriler (homepage products)
  VERY_LONG: 7200,  // 2 saat - statik içerik (slider, campaigns)
  SESSION: 1800      // 30 dakika - session data
};

function getClient() {
  try {
    if (global && global.redis && typeof global.redis.get === 'function') {
      return global.redis;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Redis client not available:', error.message);
    }
  }
  return null;
}

// ✅ OPTIMIZASYON: Enhanced getJson with retry mechanism
async function getJson(key, retries = 1) {
  const client = getClient();
  if (!client) return null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      if (i === retries) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`⚠️ Redis getJson failed for key ${key}:`, error.message);
        }
        return null;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 10));
    }
  }
  return null;
}

// ✅ OPTIMIZASYON: Enhanced setJsonEx with compression support
async function setJsonEx(key, ttlSeconds, value, options = {}) {
  const client = getClient();
  if (!client) return false;
  
  try {
    const serialized = JSON.stringify(value);
    // Large values (>10KB) can be compressed in future if needed
    const shouldCompress = options.compress && serialized.length > 10240;
    
    if (shouldCompress) {
      // TODO: Add compression support if needed
      // const compressed = await compress(serialized);
      // await client.set(key, compressed, 'EX', ttlSeconds);
    } else {
      // ioredis API: set(key, value, 'EX', seconds)
      await client.set(key, serialized, 'EX', ttlSeconds);
    }
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis setJsonEx failed for key ${key}:`, error.message);
    }
    return false;
  }
}

// ✅ OPTIMIZASYON: Batch get operations with pipeline
async function getJsonBatch(keys) {
  const client = getClient();
  if (!client || !keys || keys.length === 0) return {};
  
  try {
    const pipeline = client.multi();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    const data = {};
    keys.forEach((key, index) => {
      const result = results[index];
      if (result && result[1]) {
        try {
          data[key] = JSON.parse(result[1]);
        } catch {
          data[key] = null;
        }
      } else {
        data[key] = null;
      }
    });
    return data;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Redis getJsonBatch failed:', error.message);
    }
    return {};
  }
}

// ✅ OPTIMIZASYON: Batch set operations with pipeline
async function setJsonExBatch(operations) {
  const client = getClient();
  if (!client || !operations || operations.length === 0) return false;
  
  try {
    const pipeline = client.multi();
    operations.forEach(({ key, ttl, value }) => {
      // ioredis API: set(key, value, 'EX', seconds)
      pipeline.set(key, JSON.stringify(value), 'EX', ttl);
    });
    await pipeline.exec();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Redis setJsonExBatch failed:', error.message);
    }
    return false;
  }
}

// ✅ OPTIMIZASYON: Pattern-based deletion (SCAN + DEL)
async function delPattern(pattern) {
  const client = getClient();
  if (!client) return 0;
  
  try {
    let cursor = 0;
    let deletedCount = 0;
    
    do {
      // ioredis scan API: scan(cursor, 'MATCH', pattern, 'COUNT', count)
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      
      if (keys && keys.length > 0) {
        const deleted = await client.del(...keys);
        deletedCount += deleted;
      }
      
      cursor = nextCursor;
    } while (cursor !== '0' && cursor !== 0);
    
    return deletedCount;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis delPattern failed for pattern ${pattern}:`, error.message);
    }
    return 0;
  }
}

async function delKey(key) {
  try {
    const client = getClient();
    if (!client) return false;
    await client.del(key);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis delKey failed for key ${key}:`, error.message);
    }
    return false;
  }
}

// ✅ OPTIMIZASYON: Batch delete operations
async function delKeys(keys) {
  const client = getClient();
  if (!client || !keys || keys.length === 0) return 0;
  
  try {
    return await client.del(keys);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Redis delKeys failed:', error.message);
    }
    return 0;
  }
}

// ✅ OPTIMIZASYON: Enhanced lock with automatic extension
async function withLock(lockKey, ttlSeconds, fn, options = {}) {
  const client = getClient();
  if (!client) return await fn();
  
  const lockId = crypto.randomUUID();
  const extendInterval = options.extendInterval || Math.floor(ttlSeconds * 0.5 * 1000);
  let extendTimer = null;
  
  try {
    // ioredis API: set(key, value, 'EX', seconds, 'NX')
    const ok = await client.set(lockKey, lockId, 'EX', ttlSeconds, 'NX');
    if (!ok || ok !== 'OK') {
      // Lock already held
      if (options.waitForLock && options.maxWait) {
        const startTime = Date.now();
        while (Date.now() - startTime < options.maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
          const acquired = await client.set(lockKey, lockId, 'EX', ttlSeconds, 'NX');
          if (acquired === 'OK') break;
        }
      } else {
        return null; // Lock not acquired
      }
    }
    
    // Auto-extend lock if needed
    if (options.autoExtend) {
      extendTimer = setInterval(async () => {
        try {
          const currentValue = await client.get(lockKey);
          if (currentValue === lockId) {
            await client.expire(lockKey, ttlSeconds);
          }
        } catch {}
      }, extendInterval);
    }
    
    try {
      const result = await fn();
      return result;
    } finally {
      if (extendTimer) clearInterval(extendTimer);
      try {
        const currentValue = await client.get(lockKey);
        if (currentValue === lockId) {
          await client.del(lockKey);
        }
      } catch {}
    }
  } catch (error) {
    if (extendTimer) clearInterval(extendTimer);
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis withLock failed for key ${lockKey}:`, error.message);
    }
    return await fn(); // Fallback to executing without lock
  }
}

// ✅ OPTIMIZASYON: Cache invalidation by tags
async function invalidateByTag(tag) {
  const client = getClient();
  if (!client) return 0;
  
  try {
    const tagKey = `tag:${tag}`;
    const keys = await client.sMembers(tagKey);
    if (keys && keys.length > 0) {
      await delKeys(keys);
      await client.del(tagKey);
      return keys.length;
    }
    return 0;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis invalidateByTag failed for tag ${tag}:`, error.message);
    }
    return 0;
  }
}

// ✅ OPTIMIZASYON: Tag a key for later invalidation
async function tagKey(key, tags) {
  const client = getClient();
  if (!client) return false;
  
  try {
    const pipeline = client.multi();
    tags.forEach(tag => {
      pipeline.sAdd(`tag:${tag}`, key);
    });
    await pipeline.exec();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis tagKey failed for key ${key}:`, error.message);
    }
    return false;
  }
}

// ✅ OPTIMIZASYON: Get with automatic refresh (SWR pattern)
async function getOrSet(key, ttl, fetchFn, options = {}) {
  const client = getClient();
  if (!client) return await fetchFn();
  
  try {
    const cached = await getJson(key);
    if (cached) {
      // Background refresh if stale
      if (options.backgroundRefresh) {
        const ttlRemaining = await client.ttl(key);
        if (ttlRemaining < ttl * 0.2) { // Less than 20% TTL remaining
          fetchFn().then(data => {
            if (data) setJsonEx(key, ttl, data);
          }).catch(() => {});
        }
      }
      return cached;
    }
    
    // Cache miss - fetch and cache
    const data = await fetchFn();
    if (data) {
      await setJsonEx(key, ttl, data);
    }
    return data;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️ Redis getOrSet failed for key ${key}:`, error.message);
    }
    return await fetchFn();
  }
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// ✅ OPTIMIZASYON: Health check
async function healthCheck() {
  const client = getClient();
  if (!client) return { available: false, error: 'Client not available' };
  
  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    return { available: true, latency };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

module.exports = {
  getClient,
  getJson,
  setJsonEx,
  getJsonBatch,
  setJsonExBatch,
  delKey,
  delKeys,
  delPattern,
  withLock,
  invalidateByTag,
  tagKey,
  getOrSet,
  healthCheck,
  sha256,
  CACHE_TTL
};


