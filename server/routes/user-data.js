const express = require('express');
const router = express.Router();
const UserDataLogger = require('../services/user-data-logger');

const userDataLogger = new UserDataLogger();


// Kullanıcı verilerini kaydet
router.post('/save-user', async (req, res) => {
  try {
    const { userId, name, surname } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const result = userDataLogger.saveUser(userId, name, surname);

    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kaydedilemedi'
    });
  }
});

// Kullanıcı verilerini getir
router.get('/users', async (req, res) => {
  try {
    const result = userDataLogger.getUsersData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Kullanıcı verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri getirilemedi'
    });
  }
});

// Aktivite verilerini kaydet
router.post('/save-activity', async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'userId ve activityType gerekli'
      });
    }

    const result = userDataLogger.saveActivity(userId, activityType, activityData);

    if (result) {
      res.json({
        success: true,
        message: 'Aktivite kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Aktivite kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Aktivite kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite kaydedilemedi'
    });
  }
});

// Aktivite verilerini getir
router.get('/activities', async (req, res) => {
  try {
    const result = userDataLogger.getActivitiesData();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Aktivite verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri getirilemedi'
    });
  }
});

// Tüm verileri temizle
router.delete('/clear-all', async (req, res) => {
  try {
    const result = userDataLogger.clearAllData();
    
    if (result) {
      res.json({
        success: true,
        message: 'Tüm veriler temizlendi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Veriler temizlenemedi'
      });
    }
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler temizlenemedi'
    });
  }
});

// Behavior Tracking Endpoints
// Lazy load poolWrapper to avoid initialization order issues
function getPoolWrapper() {
  if (global.poolWrapper) {
    return global.poolWrapper;
  }
  const { poolWrapper } = require('../database-schema');
  return poolWrapper;
}
const mlService = require('../services/ml-service');

/**
 * Event tracking endpoint
 * POST /api/user-data/behavior/track
 * 
 * Önemli: Login yaptığında userId zorunlu olmalı
 * sessionId her zaman zorunlu
 */
router.post('/behavior/track', async (req, res) => {
  try {
    const { userId, deviceId, eventType, screenName, eventData, sessionId } = req.body;

    // Zorunlu alanlar: deviceId, eventType, sessionId
    if (!deviceId || !eventType || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, eventType ve sessionId zorunludur'
      });
    }

    // Geçerli eventType kontrolü
    const validEventTypes = [
      'screen_view', 'screen_exit', 'performance',
      'button_click', 'product_view', 'add_to_cart', 
      'purchase', 'search_query', 'error_event'
    ];
    if (!validEventTypes.includes(eventType)) {
      console.warn(`⚠️ Geçersiz eventType: ${eventType}`);
    }

    const poolWrapper = getPoolWrapper();
    let tenantId = 1;
    let userName = null;

    // userId varsa kullanıcı bilgilerini al
    if (userId) {
      try {
        const [users] = await poolWrapper.execute(
          'SELECT tenantId, name FROM users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          tenantId = users[0].tenantId;
          userName = users[0].name;
        }
      } catch (e) {
        console.warn('⚠️ Error getting user info:', e.message);
      }
    }

    // IP adresi ve user agent
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    // eventData'yı parse et ve kolonlara böl
    const parsedEventData = eventData || {};
    const timeOnScreen = parsedEventData.timeOnScreen || null;
    const action = parsedEventData.action || null;
    const responseTime = parsedEventData.responseTime || parsedEventData.loadTime || null;
    const productId = parsedEventData.productId || null;
    const searchQuery = parsedEventData.searchQuery || parsedEventData.query || null;
    const errorMessage = parsedEventData.errorMessage || parsedEventData.error || null;
    const scrollDepth = parsedEventData.scrollDepth || null;
    const clickElement = parsedEventData.clickElement || parsedEventData.elementName || null;
    const orderId = parsedEventData.orderId || null;
    const amount = parsedEventData.amount || parsedEventData.totalAmount || null;

    // Timestamp'i ISO8601 formatına çevir (mikrosaniye hassasiyeti ile)
    const timestamp = parsedEventData.timestamp 
      ? new Date(parsedEventData.timestamp).toISOString().slice(0, 23).replace('T', ' ')
      : new Date().toISOString().slice(0, 23).replace('T', ' ');

    // Event'i veritabanına kaydet
    const [result] = await poolWrapper.execute(`
      INSERT INTO user_behavior_events 
      (userId, userName, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent,
       timeOnScreen, action, responseTime, productId, searchQuery, errorMessage, scrollDepth, clickElement, orderId, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId || null,
      userName,
      deviceId,
      eventType,
      screenName || null,
      JSON.stringify(parsedEventData),
      sessionId,
      timestamp,
      ipAddress,
      userAgent,
      timeOnScreen,
      action,
      responseTime,
      productId,
      searchQuery,
      errorMessage,
      scrollDepth,
      clickElement,
      orderId,
      amount
    ]);

    const eventId = result.insertId;

    // screen_view → screen_exit ilişkisini kontrol et
    if (eventType === 'screen_view') {
      // Önceki screen_exit'i kontrol et (aynı screenName için)
      try {
        const [previousExit] = await poolWrapper.execute(`
          SELECT id FROM user_behavior_events 
          WHERE sessionId = ? AND screenName = ? AND eventType = 'screen_exit'
          ORDER BY timestamp DESC LIMIT 1
        `, [sessionId, screenName]);
        
        if (previousExit.length === 0 && eventId > 1) {
          // Önceki screen_view için exit yoksa, otomatik exit oluştur
          const [previousView] = await poolWrapper.execute(`
            SELECT id, screenName, timestamp FROM user_behavior_events 
            WHERE sessionId = ? AND eventType = 'screen_view' AND id < ?
            ORDER BY timestamp DESC LIMIT 1
          `, [sessionId, eventId]);
          
          if (previousView.length > 0) {
            const prevScreen = previousView[0].screenName;
            const prevTimestamp = new Date(previousView[0].timestamp);
            const timeDiff = Math.floor((new Date(timestamp) - prevTimestamp) / 1000);
            
            if (timeDiff > 0 && prevScreen !== screenName) {
              await poolWrapper.execute(`
                INSERT INTO user_behavior_events 
                (userId, userName, deviceId, eventType, screenName, eventData, sessionId, timestamp, ipAddress, userAgent, timeOnScreen)
                VALUES (?, ?, ?, 'screen_exit', ?, ?, ?, ?, ?, ?, ?)
              `, [
                userId || null,
                userName,
                deviceId,
                prevScreen,
                JSON.stringify({ screenName: prevScreen, autoExit: true }),
                sessionId,
                timestamp,
                ipAddress,
                userAgent,
                timeDiff
              ]);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Error checking screen_exit relationship:', e.message);
      }
    }

    // Send to ML queue for processing
    try {
      await mlService.sendEventToML({
        id: eventId,
        userId: userId || null,
        userName,
        deviceId,
        eventType,
        screenName: screenName || null,
        eventData: parsedEventData,
        sessionId,
        timestamp: new Date(timestamp).toISOString()
      });
    } catch (mlError) {
      // Don't fail the request if ML queue fails
      console.warn('⚠️ Failed to send event to ML queue:', mlError.message);
    }

    res.json({
      success: true,
      message: 'Event kaydedildi'
    });
  } catch (error) {
    console.error('❌ Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Event kaydedilemedi'
    });
  }
});

/**
 * Session başlatma endpoint
 * POST /api/user-data/behavior/session/start
 */
router.post('/behavior/session/start', async (req, res) => {
  try {
    const { userId, deviceId, sessionId, metadata } = req.body;

    if (!deviceId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId ve sessionId gerekli'
      });
    }

    // Tenant ID'yi userId'den al veya default kullan
    let tenantId = 1;
    if (userId) {
      try {
        const poolWrapper = getPoolWrapper();
        const [users] = await poolWrapper.execute(
          'SELECT tenantId FROM users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          tenantId = users[0].tenantId;
        }
      } catch (e) {
        // Hata durumunda default tenantId kullan
      }
    }

    // Session'ı veritabanına kaydet
    const poolWrapper = getPoolWrapper();
    await poolWrapper.execute(`
      INSERT INTO user_sessions 
      (userId, deviceId, sessionId, startTime, metadata)
      VALUES (?, ?, ?, NOW(), ?)
      ON DUPLICATE KEY UPDATE startTime = NOW(), metadata = ?
    `, [
      userId || null,
      deviceId,
      sessionId,
      JSON.stringify(metadata || {}),
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      message: 'Session başlatıldı',
      sessionId
    });
  } catch (error) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({
      success: false,
      message: 'Session başlatılamadı'
    });
  }
});

/**
 * Session bitirme endpoint
 * POST /api/user-data/behavior/session/end
 */
router.post('/behavior/session/end', async (req, res) => {
  try {
    const { sessionId, duration, pageCount, scrollDepth, metadata } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId gerekli'
      });
    }

    // Session'ı güncelle
    const poolWrapper = getPoolWrapper();
    const [result] = await poolWrapper.execute(`
      UPDATE user_sessions 
      SET endTime = NOW(),
          duration = ?,
          pageCount = ?,
          scrollDepth = ?,
          metadata = JSON_MERGE_PATCH(COALESCE(metadata, '{}'), ?)
      WHERE sessionId = ?
    `, [
      duration || 0,
      pageCount || 0,
      scrollDepth || 0,
      JSON.stringify(metadata || {}),
      sessionId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Session sonlandırıldı'
    });
  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Session sonlandırılamadı'
    });
  }
});

/**
 * Device-user bağlama endpoint
 * POST /api/user-data/behavior/link-device
 */
router.post('/behavior/link-device', async (req, res) => {
  try {
    const { deviceId, userId } = req.body;

    if (!deviceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId ve userId gerekli'
      });
    }

    // Tenant ID'yi userId'den al
    const poolWrapper = getPoolWrapper();
    const [users] = await poolWrapper.execute(
      'SELECT tenantId FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const tenantId = users[0].tenantId;

    // Device'ı user'a bağla - mevcut event'lerdeki userId'leri güncelle
    await poolWrapper.execute(`
      UPDATE user_behavior_events 
      SET userId = ?
      WHERE deviceId = ? AND userId IS NULL
    `, [userId, deviceId]);

    // Session'lardaki userId'leri güncelle
    await poolWrapper.execute(`
      UPDATE user_sessions 
      SET userId = ?
      WHERE deviceId = ? AND userId IS NULL
    `, [userId, deviceId]);

    res.json({
      success: true,
      message: 'Device kullanıcıya bağlandı'
    });
  } catch (error) {
    console.error('❌ Error linking device:', error);
    res.status(500).json({
      success: false,
      message: 'Device bağlanamadı'
    });
  }
});

module.exports = router;
