/**
 * CSRF (Cross-Site Request Forgery) Koruması
 * State-changing operations için CSRF token kontrolü
 */

const crypto = require('crypto');
const { getJson, setJsonEx, delKey } = require('../redis');

class CSRFProtection {
  constructor() {
    this.tokenExpiry = 3600; // 1 saat
    this.secret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  }

  /**
   * CSRF token oluştur
   */
  generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHmac('sha256', this.secret)
      .update(token)
      .digest('hex');
    
    // Token'ı Redis'te sakla (sessionId ile)
    const cacheKey = `csrf:${sessionId}:${tokenHash}`;
    setJsonEx(cacheKey, this.tokenExpiry, { 
      token: tokenHash, 
      sessionId,
      createdAt: Date.now() 
    }).catch(() => {});
    
    return token;
  }

  /**
   * CSRF token doğrula
   */
  async verifyToken(sessionId, token) {
    if (!sessionId || !token) {
      return false;
    }

    try {
      const tokenHash = crypto.createHmac('sha256', this.secret)
        .update(token)
        .digest('hex');
      
      const cacheKey = `csrf:${sessionId}:${tokenHash}`;
      const cached = await getJson(cacheKey);
      
      if (!cached || cached.sessionId !== sessionId) {
        return false;
      }

      // Token kullanıldı, tekrar kullanılamaz (optional: one-time use)
      // await delKey(cacheKey);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Session ID'yi request'ten al
   */
  getSessionId(req) {
    // Önce Authorization header'dan JWT token'dan sessionId çıkar
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.decode(token);
        if (decoded && decoded.sessionId) {
          return decoded.sessionId;
        }
        if (decoded && decoded.userId) {
          return `user:${decoded.userId}`;
        }
      } catch {}
    }

    // API key'den session oluştur
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return `apikey:${crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16)}`;
    }

    // IP + User-Agent kombinasyonu
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    return `session:${crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').substring(0, 16)}`;
  }

  /**
   * CSRF Middleware
   * State-changing operations için CSRF token kontrolü
   */
  createCSRFMiddleware(options = {}) {
    const { 
      skipMethods = ['GET', 'HEAD', 'OPTIONS'],
      skipPaths = ['/api/health', '/api/admin/login'],
      requireToken = true 
    } = options;

    return async (req, res, next) => {
      // Skip safe methods
      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Skip specific paths
      if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Skip if token not required
      if (!requireToken) {
        return next();
      }

      // Get session ID
      const sessionId = this.getSessionId(req);
      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Session required for CSRF protection'
        });
      }

      // Get CSRF token from header or body
      const csrfToken = req.headers['x-csrf-token'] || 
                       req.headers['csrf-token'] || 
                       req.body?._csrf ||
                       req.query?._csrf;

      if (!csrfToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF token required. Please provide X-CSRF-Token header or _csrf in body/query.',
          code: 'CSRF_TOKEN_MISSING'
        });
      }

      // Verify token
      const isValid = await this.verifyToken(sessionId, csrfToken);
      if (!isValid) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
      }

      next();
    };
  }

  /**
   * CSRF token endpoint (GET request için token almak için)
   */
  async getTokenHandler(req, res) {
    try {
      const sessionId = this.getSessionId(req);
      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Session required'
        });
      }

      const token = this.generateToken(sessionId);
      res.json({
        success: true,
        data: { csrfToken: token },
        message: 'CSRF token generated'
      });
    } catch (error) {
      console.error('❌ CSRF token generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating CSRF token'
      });
    }
  }
}

module.exports = new CSRFProtection();

