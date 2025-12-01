const express = require('express');
const router = express.Router();
const { poolWrapper } = require('../orm/sequelize');

// In-memory storage for live users (temporary - will be replaced with database)
let liveUsers = [];

// Helper function to get user info from database
async function getUserInfo(userId) {
  if (!userId) return null;
  try {
    const [rows] = await poolWrapper.execute(
      'SELECT id, name, phone FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return rows.length > 0 ? { name: rows[0].name, phone: rows[0].phone } : null;
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    return null;
  }
}

// Get live users
router.get('/', async (req, res) => {
  try {
    console.log('👥 Live users requested');
    
    // Return actual live users data (no mock simulation)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Filter out inactive users (older than 5 minutes)
    let activeUsers = liveUsers.filter(user => {
      const lastActivity = new Date(user.lastActivity);
      return lastActivity > fiveMinutesAgo;
    });

    // Enrich with user info from database
    activeUsers = await Promise.all(activeUsers.map(async (user) => {
      if (user.userId) {
        const userInfo = await getUserInfo(user.userId);
        if (userInfo) {
          return {
            ...user,
            userName: userInfo.name,
            userPhone: userInfo.phone
          };
        }
      }
      return user;
    }));

    console.log(`📊 Returning ${activeUsers.length} active users out of ${liveUsers.length} total`);
    
    res.json({
      success: true,
      data: activeUsers
    });
  } catch (error) {
    console.error('❌ Error getting live users:', error);
    res.status(500).json({ success: false, message: 'Error getting live users' });
  }
});

// Add new live user (when user visits)
router.post('/', (req, res) => {
  try {
    const { userId, sessionId, ipAddress, userAgent, page, referrer } = req.body;
    
    // Default location for development (in production, use IP geolocation service)
    const defaultLocation = {
      country: 'Türkiye',
      city: 'İstanbul', 
      region: 'Marmara',
      lat: 41.0082,
      lng: 28.9784
    };
    
    // Parse user agent for device/browser info
    const device = userAgent.includes('Mobile') ? 'Mobile' : 
                   userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' : 'Other';
    const os = userAgent.includes('Windows') ? 'Windows' :
              userAgent.includes('Mac') ? 'macOS' :
              userAgent.includes('Linux') ? 'Linux' : 'Other';
    
    const newUser = {
      id: Date.now().toString(),
      userId,
      sessionId,
      ipAddress,
      country: defaultLocation.country,
      city: defaultLocation.city,
      region: defaultLocation.region,
      latitude: defaultLocation.lat,
      longitude: defaultLocation.lng,
      userAgent,
      device,
      browser,
      os,
      lastActivity: new Date().toISOString(),
      isActive: true,
      page,
      duration: 0,
      referrer
    };
    
    // Remove existing user with same session
    liveUsers = liveUsers.filter(u => u.sessionId !== sessionId);
    liveUsers.push(newUser);
    
    console.log('✅ New live user added:', newUser.city, newUser.country);
    res.json({
      success: true,
      data: newUser
    });
  } catch (error) {
    console.error('❌ Error adding live user:', error);
    res.status(500).json({ success: false, message: 'Error adding live user' });
  }
});

// Update user activity
router.patch('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page, duration } = req.body;
    
    const userIndex = liveUsers.findIndex(u => u.sessionId === sessionId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    liveUsers[userIndex] = {
      ...liveUsers[userIndex],
      page,
      duration,
      lastActivity: new Date().toISOString(),
      isActive: true
    };
    
    console.log('✅ User activity updated:', sessionId);
    res.json({
      success: true,
      data: liveUsers[userIndex]
    });
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
    res.status(500).json({ success: false, message: 'Error updating user activity' });
  }
});

// Remove inactive users
router.delete('/inactive', (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const beforeCount = liveUsers.length;
    liveUsers = liveUsers.filter(user => {
      const lastActivity = new Date(user.lastActivity);
      return lastActivity > fiveMinutesAgo;
    });
    
    const removedCount = beforeCount - liveUsers.length;
    console.log('🧹 Removed inactive users:', removedCount);
    
    res.json({
      success: true,
      message: `Removed ${removedCount} inactive users`,
      data: { removedCount }
    });
  } catch (error) {
    console.error('❌ Error removing inactive users:', error);
    res.status(500).json({ success: false, message: 'Error removing inactive users' });
  }
});

module.exports = router;
