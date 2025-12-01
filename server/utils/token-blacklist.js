/**
 * Token Blacklist Utility
 * GÜVENLİK: Token blacklist yönetimi - Production'da Redis kullanılmalı
 */

const poolWrapper = require('../pool-wrapper');

class TokenBlacklist {
  constructor() {
    // In-memory cache (fallback)
    this.memoryCache = new Map();
    this.cacheExpiry = new Map();
    
    // Cache TTL (5 dakika)
    this.CACHE_TTL = 5 * 60 * 1000;
  }

  /**
   * Token'ı blacklist'e ekle
   * GÜVENLİK: Database'e kaydet ve memory cache'e ekle
   */
  async addToken(token, userId, expiresAt) {
    try {
      // Database'e kaydet
      const expiryTime = expiresAt ? new Date(expiresAt * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await poolWrapper.execute(
        `INSERT INTO token_blacklist (token_hash, user_id, expires_at, created_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
        [this.hashToken(token), userId, expiryTime]
      );

      // Memory cache'e ekle
      this.memoryCache.set(token, {
        userId,
        expiresAt: expiryTime.getTime()
      });
      this.cacheExpiry.set(token, Date.now() + this.CACHE_TTL);

      // Expired token'ları temizle
      this.cleanupExpiredTokens();
    } catch (error) {
      // Database hatası durumunda memory cache'e ekle
      console.warn('⚠️ Token blacklist database error, using memory cache:', error.message);
      this.memoryCache.set(token, {
        userId,
        expiresAt: expiresAt ? expiresAt * 1000 : Date.now() + 24 * 60 * 60 * 1000
      });
    }
  }

  /**
   * Token'ın blacklist'te olup olmadığını kontrol et
   */
  async isTokenBlacklisted(token) {
    try {
      // Memory cache kontrolü
      const cached = this.memoryCache.get(token);
      if (cached) {
        if (Date.now() > cached.expiresAt) {
          // Expired, cache'den sil
          this.memoryCache.delete(token);
          this.cacheExpiry.delete(token);
          return false;
        }
        return true;
      }

      // Cache expiry kontrolü
      const cacheTime = this.cacheExpiry.get(token);
      if (cacheTime && Date.now() < cacheTime) {
        // Cache'de yok ama henüz expire olmamış, database'den kontrol et
        const tokenHash = this.hashToken(token);
        const [rows] = await poolWrapper.execute(
          `SELECT expires_at FROM token_blacklist 
           WHERE token_hash = ? AND expires_at > NOW() 
           LIMIT 1`,
          [tokenHash]
        );

        if (rows.length > 0) {
          // Database'de var, cache'e ekle
          this.memoryCache.set(token, {
            userId: null,
            expiresAt: new Date(rows[0].expires_at).getTime()
          });
          this.cacheExpiry.set(token, Date.now() + this.CACHE_TTL);
          return true;
        }
      }

      return false;
    } catch (error) {
      // Database hatası durumunda memory cache'e bak
      console.warn('⚠️ Token blacklist check error, using memory cache:', error.message);
      const cached = this.memoryCache.get(token);
      if (cached && Date.now() <= cached.expiresAt) {
        return true;
      }
      return false;
    }
  }

  /**
   * Kullanıcının tüm token'larını iptal et
   */
  async revokeAllUserTokens(userId) {
    try {
      // Database'de tüm token'ları iptal et
      await poolWrapper.execute(
        `UPDATE token_blacklist 
         SET expires_at = NOW() 
         WHERE user_id = ? AND expires_at > NOW()`,
        [userId]
      );

      // Memory cache'den kullanıcının token'larını temizle
      for (const [token, data] of this.memoryCache.entries()) {
        if (data.userId === userId) {
          this.memoryCache.delete(token);
          this.cacheExpiry.delete(token);
        }
      }
    } catch (error) {
      console.error('❌ Error revoking user tokens:', error);
    }
  }

  /**
   * Token'ı hash'le (güvenlik için)
   */
  hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Expired token'ları temizle
   */
  async cleanupExpiredTokens() {
    try {
      // Database'den expired token'ları sil
      await poolWrapper.execute(
        `DELETE FROM token_blacklist WHERE expires_at < NOW()`
      );

      // Memory cache'den expired token'ları temizle
      const now = Date.now();
      for (const [token, data] of this.memoryCache.entries()) {
        if (now > data.expiresAt) {
          this.memoryCache.delete(token);
          this.cacheExpiry.delete(token);
        }
      }
    } catch (error) {
      console.warn('⚠️ Token blacklist cleanup error:', error.message);
    }
  }

  /**
   * Blacklist istatistikleri
   */
  async getStats() {
    try {
      const [rows] = await poolWrapper.execute(
        `SELECT COUNT(*) as total FROM token_blacklist WHERE expires_at > NOW()`
      );
      return {
        total: rows[0].total,
        memoryCache: this.memoryCache.size
      };
    } catch (error) {
      return {
        total: 0,
        memoryCache: this.memoryCache.size,
        error: error.message
      };
    }
  }
}

// Singleton instance
let instance = null;

function getTokenBlacklist() {
  if (!instance) {
    instance = new TokenBlacklist();
    // Periyodik temizlik (her 10 dakikada bir)
    setInterval(() => {
      instance.cleanupExpiredTokens();
    }, 10 * 60 * 1000);
  }
  return instance;
}

module.exports = getTokenBlacklist;

