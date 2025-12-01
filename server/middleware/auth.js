const { poolWrapper } = require('../database-schema');

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
  try {
    // Admin key kontrolü aktif
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!adminKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin key required. Please provide X-Admin-Key header or Authorization Bearer token.' 
      });
    }
    
    // Check admin key against environment variable (with default fallback)
    const validAdminKey = process.env.ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS';
    
    if (adminKey !== validAdminKey) {
      console.warn(`⚠️ Invalid admin key attempt from IP: ${req.ip}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin key' 
      });
    }
    
    console.log('✅ Admin authenticated:', req.path);
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

// Tenant authentication middleware
async function authenticateTenant(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 1;
    
    // Get tenant info
    const [tenants] = await poolWrapper.execute(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );
    
    if (tenants.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid tenant' 
      });
    }
    
    req.tenant = tenants[0];
    next();
  } catch (error) {
    console.error('Tenant authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
}

module.exports = {
  authenticateAdmin,
  authenticateTenant
};
