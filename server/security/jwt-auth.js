/**
 * JWT Authentication Sistemi
 * GÜVENLİK: Token tabanlı kimlik doğrulama - Güçlendirilmiş session management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const getTokenBlacklist = require('../utils/token-blacklist');
const { logError, createSafeErrorResponse } = require('../utils/error-handler');

class JWTAuth {
  constructor() {
    // GÜVENLİK: Secret'lar environment variable'lardan alınmalı
    this.secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
    
    // GÜVENLİK: Token expiration time'ları - Güvenli default'lar
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 dakika
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 gün
    
    // GÜVENLİK: Token rotation için minimum refresh interval
    this.minRefreshInterval = parseInt(process.env.JWT_MIN_REFRESH_INTERVAL || '300', 10); // 5 dakika
    
    this.issuer = 'huglu-api';
    this.audience = 'huglu-client';
    
    // GÜVENLİK: Token blacklist - Database tabanlı
    this.tokenBlacklist = getTokenBlacklist();
    
    // GÜVENLİK: Refresh token rotation tracking (user ID -> last refresh time)
    this.refreshTokenRotation = new Map();
  }

  /**
   * Access Token oluştur
   */
  generateAccessToken(payload) {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * Refresh Token oluştur
   */
  generateRefreshToken(payload) {
    const tokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      iss: this.issuer,
      aud: this.audience,
      jti: crypto.randomUUID() // JWT ID
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * Token çifti oluştur (Access + Refresh)
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiry(this.accessTokenExpiry)
    };
  }

  /**
   * Access Token doğrula
   * GÜVENLİK: Blacklist kontrolü ve expiration kontrolü
   */
  async verifyAccessToken(token) {
    try {
      // GÜVENLİK: Önce blacklist kontrolü (hızlı kontrol)
      const isBlacklisted = await this.tokenBlacklist.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      // GÜVENLİK: Token type kontrolü
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // GÜVENLİK: Expiration kontrolü (ekstra güvenlik)
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new Error('Token has expired');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh Token doğrula
   * GÜVENLİK: Blacklist kontrolü, expiration kontrolü ve rotation kontrolü
   */
  async verifyRefreshToken(token) {
    try {
      // GÜVENLİK: Önce blacklist kontrolü
      const isBlacklisted = await this.tokenBlacklist.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });

      // GÜVENLİK: Token type kontrolü
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // GÜVENLİK: Expiration kontrolü
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new Error('Token has expired');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  /**
   * Token'ı blacklist'e ekle
   * GÜVENLİK: Database tabanlı blacklist
   */
  async revokeToken(token, userId = null) {
    try {
      // Token'ı decode et (expiration time için)
      const decoded = this.decodeToken(token);
      const expiresAt = decoded?.exp || null;
      
      // Blacklist'e ekle
      await this.tokenBlacklist.addToken(token, userId, expiresAt);
    } catch (error) {
      console.error('❌ Error revoking token:', error);
    }
  }

  /**
   * Tüm kullanıcı token'larını iptal et
   * GÜVENLİK: Database tabanlı blacklist
   */
  async revokeAllUserTokens(userId) {
    try {
      await this.tokenBlacklist.revokeAllUserTokens(userId);
      console.log(`✅ All tokens revoked for user: ${userId}`);
    } catch (error) {
      console.error('❌ Error revoking all user tokens:', error);
    }
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkar
   * GÜVENLİK: Async token verification
   */
  async extractUserFromToken(token) {
    try {
      const decoded = await this.verifyAccessToken(token);
      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      throw new Error(`User extraction failed: ${error.message}`);
    }
  }

  /**
   * Token süresini parse et
   */
  parseExpiry(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
  }

  /**
   * JWT Middleware
   * GÜVENLİK: Async token verification ile güçlendirilmiş
   */
  createJWTMiddleware(options = {}) {
    const { required = true, optional = false } = options;

    return async (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (required) {
          return res.status(401).json({
            success: false,
            message: 'Authorization header required'
          });
        }
        if (optional) {
          return next();
        }
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      try {
        // GÜVENLİK: Async token verification
        const decoded = await this.verifyAccessToken(token);
        req.user = decoded;
        req.token = token;
        next();
      } catch (error) {
        // GÜVENLİK: Error information disclosure - Generic mesaj
        logError(error, 'JWT_VERIFY');
        const errorResponse = createSafeErrorResponse(error, 'Invalid or expired token');
        return res.status(401).json(errorResponse);
      }
    };
  }

  /**
   * Role-based access control middleware
   */
  createRoleMiddleware(requiredRoles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      
      if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Permission-based access control middleware
   */
  createPermissionMiddleware(requiredPermissions = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      }

      next();
    };
  }

  /**
   * Token refresh endpoint handler
   * GÜVENLİK: Token rotation ile güçlendirilmiş refresh mekanizması
   */
  async handleTokenRefresh(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // GÜVENLİK: Refresh token'ı doğrula
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // GÜVENLİK: Token rotation kontrolü - Çok sık refresh engelle
      const userId = decoded.userId;
      const lastRefresh = this.refreshTokenRotation.get(userId);
      const now = Date.now();
      
      if (lastRefresh && (now - lastRefresh) < this.minRefreshInterval * 1000) {
        return res.status(429).json({
          success: false,
          message: 'Too many refresh requests. Please wait before refreshing again.',
          retryAfter: Math.ceil((this.minRefreshInterval * 1000 - (now - lastRefresh)) / 1000)
        });
      }

      // GÜVENLİK: Eski refresh token'ı iptal et (token rotation)
      await this.revokeToken(refreshToken, userId);
      
      // GÜVENLİK: Yeni token çifti oluştur
      const newTokens = this.generateTokenPair({
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        permissions: decoded.permissions || []
      });

      // GÜVENLİK: Refresh rotation tracking
      this.refreshTokenRotation.set(userId, now);

      res.json({
        success: true,
        data: newTokens
      });
    } catch (error) {
      // GÜVENLİK: Error information disclosure - Generic mesaj
      logError(error, 'TOKEN_REFRESH');
      const errorResponse = createSafeErrorResponse(error, 'Invalid refresh token');
      res.status(401).json(errorResponse);
    }
  }

  /**
   * Logout handler
   * GÜVENLİK: Token'ı blacklist'e ekle ve refresh token rotation'ı temizle
   */
  async handleLogout(req, res) {
    try {
      const token = req.token;
      const userId = req.user?.userId;
      
      // GÜVENLİK: Access token'ı iptal et
      if (token) {
        await this.revokeToken(token, userId);
      }

      // GÜVENLİK: Refresh token rotation tracking'i temizle
      if (userId) {
        this.refreshTokenRotation.delete(userId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      // GÜVENLİK: Error information disclosure - Generic mesaj
      logError(error, 'LOGOUT');
      const errorResponse = createSafeErrorResponse(error, 'Logout failed');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Token bilgilerini decode et (blacklist kontrolü olmadan)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Token'ın süresini kontrol et
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Güvenlik raporu
   * GÜVENLİK: Database tabanlı blacklist istatistikleri
   */
  async getSecurityReport() {
    try {
      const stats = await this.tokenBlacklist.getStats();
      return {
        blacklistedTokens: stats.total,
        memoryCache: stats.memoryCache,
        secretRotated: false, // Production'da secret rotation implement edilmeli
        tokenLifetime: {
          access: this.accessTokenExpiry,
          refresh: this.refreshTokenExpiry
        },
        minRefreshInterval: this.minRefreshInterval
      };
    } catch (error) {
      return {
        blacklistedTokens: 0,
        memoryCache: 0,
        secretRotated: false,
        tokenLifetime: {
          access: this.accessTokenExpiry,
          refresh: this.refreshTokenExpiry
        },
        minRefreshInterval: this.minRefreshInterval,
        error: error.message
      };
    }
  }
}

module.exports = JWTAuth;
