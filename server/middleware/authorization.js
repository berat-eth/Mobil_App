/**
 * Authorization Middleware
 * User ownership ve resource access kontrolü
 */

const { poolWrapper } = require('../database-schema');
const { getJson, setJsonEx, CACHE_TTL } = require('../redis');

/**
 * Kullanıcının belirli bir resource'a erişim hakkı olup olmadığını kontrol et
 * ✅ OPTIMIZASYON: Redis cache ile performans iyileştirmesi
 */
async function checkUserOwnership(userId, resourceType, resourceId, tenantId) {
  try {
    // Cache key oluştur
    const cacheKey = `ownership:${resourceType}:${resourceId}:${tenantId}:${userId}`;
    
    // Cache'den kontrol et
    const cached = await getJson(cacheKey);
    if (cached !== null) {
      return cached === true;
    }

    let hasAccess = false;
    
    switch (resourceType) {
      case 'user':
        const [userRows] = await poolWrapper.execute(
          'SELECT id FROM users WHERE id = ? AND tenantId = ?',
          [resourceId, tenantId]
        );
        hasAccess = userRows.length > 0 && userRows[0].id === parseInt(userId);
        break;

      case 'address':
        const [addrRows] = await poolWrapper.execute(
          'SELECT userId FROM user_addresses WHERE id = ? AND tenantId = ?',
          [resourceId, tenantId]
        );
        hasAccess = addrRows.length > 0 && addrRows[0].userId === parseInt(userId);
        break;

      case 'order':
        const [orderRows] = await poolWrapper.execute(
          'SELECT userId FROM orders WHERE id = ? AND tenantId = ?',
          [resourceId, tenantId]
        );
        hasAccess = orderRows.length > 0 && orderRows[0].userId === parseInt(userId);
        break;

      case 'cart':
        const [cartRows] = await poolWrapper.execute(
          'SELECT userId FROM cart WHERE id = ? AND tenantId = ?',
          [resourceId, tenantId]
        );
        hasAccess = cartRows.length > 0 && cartRows[0].userId === parseInt(userId);
        break;

      case 'return_request':
        const [returnRows] = await poolWrapper.execute(
          'SELECT userId FROM return_requests WHERE id = ? AND tenantId = ?',
          [resourceId, tenantId]
        );
        hasAccess = returnRows.length > 0 && returnRows[0].userId === parseInt(userId);
        break;

      case 'wallet':
        // Wallet için resourceId aslında userId
        hasAccess = parseInt(resourceId) === parseInt(userId);
        break;

      default:
        hasAccess = false;
    }

    // Sonucu cache'le (TTL: 5 dakika)
    await setJsonEx(cacheKey, CACHE_TTL.SHORT, hasAccess);
    
    return hasAccess;
  } catch (error) {
    console.error('❌ Error checking user ownership:', error);
    return false;
  }
}

/**
 * User ID'yi request'ten güvenli şekilde al
 */
function getUserIdFromRequest(req) {
  // JWT token'dan
  if (req.user && req.user.userId) {
    return req.user.userId;
  }

  // Body'den (sadece güvenli endpoint'lerde)
  if (req.body && req.body.userId) {
    return parseInt(req.body.userId);
  }

  // Params'tan
  if (req.params && req.params.userId) {
    return parseInt(req.params.userId);
  }

  if (req.params && req.params.id) {
    // Bu genelde resource ID, user ID değil
    return null;
  }

  return null;
}

/**
 * User ownership middleware
 * Kullanıcının sadece kendi kaynaklarına erişebilmesini sağlar
 */
function requireUserOwnership(resourceType, userIdSource = 'body') {
  return async (req, res, next) => {
    try {
      // Tenant kontrolü
      if (!req.tenant || !req.tenant.id) {
        return res.status(401).json({
          success: false,
          message: 'Tenant authentication required'
        });
      }

      // User ID'yi al
      let userId;
      if (userIdSource === 'body') {
        userId = req.body?.userId;
      } else if (userIdSource === 'params') {
        userId = req.params?.userId || req.params?.id;
      } else if (userIdSource === 'query') {
        userId = req.query?.userId;
      } else if (userIdSource === 'jwt') {
        userId = req.user?.userId;
      } else {
        userId = getUserIdFromRequest(req);
      }

      // Cart için özel durum: userId yoksa, cart item'dan al
      if (!userId && resourceType === 'cart') {
        const resourceId = req.params?.cartItemId || req.params?.id;
        if (resourceId) {
          try {
            const [cartRows] = await poolWrapper.execute(
              'SELECT userId FROM cart WHERE id = ? AND tenantId = ?',
              [resourceId, req.tenant.id]
            );
            if (cartRows.length > 0) {
              userId = cartRows[0].userId;
            }
          } catch (error) {
            console.error('❌ Error getting userId from cart item:', error);
          }
        }
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID required'
        });
      }

      // Resource ID'yi al
      const resourceId = req.params?.cartItemId || req.params?.id || req.params?.resourceId || req.body?.id;

      // Eğer resource ID varsa, ownership kontrolü yap
      if (resourceId) {
        const hasAccess = await checkUserOwnership(
          userId,
          resourceType,
          resourceId,
          req.tenant.id
        );

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have permission to access this resource.'
          });
        }
      }

      // User ID'yi request'e ekle
      req.authenticatedUserId = parseInt(userId);

      // ✅ OPTIMIZASYON: User'ın tenant'ı kontrol et - Redis cache ile
      const userCacheKey = `user:${userId}:tenant`;
      let userData = await getJson(userCacheKey);
      
      if (!userData) {
        const [userRows] = await poolWrapper.execute(
          'SELECT id, tenantId FROM users WHERE id = ?',
          [userId]
        );

        if (userRows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        userData = {
          id: userRows[0].id,
          tenantId: userRows[0].tenantId
        };
        
        // Cache'le (TTL: 5 dakika)
        await setJsonEx(userCacheKey, CACHE_TTL.SHORT, userData);
      }

      if (userData.tenantId !== req.tenant.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User does not belong to this tenant.'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * User ID validation middleware
 * Body'deki userId'nin authenticated user ile eşleştiğini kontrol eder
 */
function validateUserIdMatch(userIdSource = 'body') {
  return async (req, res, next) => {
    try {
      // JWT'den user ID al
      const authenticatedUserId = req.user?.userId || req.authenticatedUserId;

      if (!authenticatedUserId) {
        // Eğer JWT yoksa, body'deki userId'yi kabul et (eski sistem uyumluluğu)
        return next();
      }

      // Request'ten userId al
      let requestUserId;
      if (userIdSource === 'body') {
        requestUserId = req.body?.userId;
      } else if (userIdSource === 'params') {
        requestUserId = req.params?.userId || req.params?.id;
      } else if (userIdSource === 'query') {
        requestUserId = req.query?.userId;
      }

      if (!requestUserId) {
        // UserId yoksa, authenticated user ID'yi kullan
        req.body = req.body || {};
        req.body.userId = authenticatedUserId;
        return next();
      }

      // User ID'ler eşleşmeli
      if (parseInt(requestUserId) !== parseInt(authenticatedUserId)) {
        return res.status(403).json({
          success: false,
          message: 'User ID mismatch. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      console.error('❌ User ID validation error:', error);
      res.status(500).json({
        success: false,
        message: 'User ID validation error'
      });
    }
  };
}

/**
 * Tenant isolation middleware
 * Kullanıcının sadece kendi tenant'ının verilerine erişebilmesini sağlar
 */
function enforceTenantIsolation() {
  return async (req, res, next) => {
    try {
      // Login ve registration endpoint'lerini skip et
      const path = req.path || '';
      const skipPaths = [
        '/users/login',
        '/users',
        '/admin/login',
        '/health',
        '/auth/google/verify'
      ];
      
      if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
        return next();
      }
      
      if (!req.tenant || !req.tenant.id) {
        // ✅ OPTIMIZASYON: Tenant yoksa default tenant'ı kullan (id: 1) - Redis cache ile
        const defaultTenantCacheKey = 'tenant:default:1';
        let defaultTenant = await getJson(defaultTenantCacheKey);
        
        if (!defaultTenant) {
          try {
            const [defaultTenantRows] = await poolWrapper.execute(
              'SELECT id, name, domain, subdomain, settings, isActive FROM tenants WHERE id = 1 AND isActive = true'
            );
            if (defaultTenantRows && defaultTenantRows.length > 0) {
              defaultTenant = defaultTenantRows[0];
              if (defaultTenant.settings) {
                try { defaultTenant.settings = JSON.parse(defaultTenant.settings); } catch (_) { }
              }
              // Cache'le (TTL: 10 dakika - tenant bilgisi nadiren değişir)
              await setJsonEx(defaultTenantCacheKey, CACHE_TTL.MEDIUM, defaultTenant);
            } else {
              // Default tenant da yoksa hata ver
              return res.status(401).json({
                success: false,
                message: 'Tenant authentication required'
              });
            }
          } catch (error) {
            console.error('❌ Error getting default tenant:', error);
            return res.status(401).json({
              success: false,
              message: 'Tenant authentication required'
            });
          }
        }
        
        req.tenant = defaultTenant;
      }

      // ✅ OPTIMIZASYON: User ID varsa, tenant kontrolü yap - Redis cache ile
      const userId = req.body?.userId || req.params?.userId || req.query?.userId;
      if (userId) {
        const userTenantCacheKey = `user:${userId}:tenantId`;
        let userTenantId = await getJson(userTenantCacheKey);
        
        if (userTenantId === null) {
          const [userRows] = await poolWrapper.execute(
            'SELECT tenantId FROM users WHERE id = ?',
            [userId]
          );
          
          if (userRows.length > 0) {
            userTenantId = userRows[0].tenantId;
            // Cache'le (TTL: 5 dakika)
            await setJsonEx(userTenantCacheKey, CACHE_TTL.SHORT, userTenantId);
          }
        }

        if (userTenantId !== null && userTenantId !== req.tenant.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. User does not belong to this tenant.'
          });
        }
      }

      next();
    } catch (error) {
      console.error('❌ Tenant isolation error:', error);
      res.status(500).json({
        success: false,
        message: 'Tenant isolation error'
      });
    }
  };
}

module.exports = {
  requireUserOwnership,
  validateUserIdMatch,
  enforceTenantIsolation,
  checkUserOwnership,
  getUserIdFromRequest
};

