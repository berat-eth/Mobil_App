const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analytics-service');
const CharacteristicService = require('../services/characteristic-service');
const { authenticateAdmin } = require('../middleware/auth');
const { poolWrapper } = require('../database-schema');

const analyticsService = new AnalyticsService();
const characteristicService = new CharacteristicService();

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

/**
 * Batch endpoint - Tüm analytics verilerini tek seferde getir
 * GET /api/admin/analytics/batch?timeRange=7d&sections=overview,users,behavior
 */
router.get('/batch', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';
    const sections = (req.query.sections || 'overview').split(',');

    const results = {};

    // Paralel olarak tüm istenen section'ları yükle
    const promises = [];

    if (sections.includes('overview')) {
      promises.push(
        analyticsService.getOverview(tenantId, timeRange)
          .then(data => ({ key: 'overview', data }))
          .catch(err => ({ key: 'overview', error: err.message }))
      );
    }

    if (sections.includes('users')) {
      promises.push(
        analyticsService.getUserAnalytics(tenantId, timeRange)
          .then(data => ({ key: 'users', data }))
          .catch(err => ({ key: 'users', error: err.message }))
      );
    }

    if (sections.includes('behavior')) {
      promises.push(
        analyticsService.getBehaviorAnalytics(tenantId, timeRange)
          .then(data => ({ key: 'behavior', data }))
          .catch(err => ({ key: 'behavior', error: err.message }))
      );
    }

    if (sections.includes('funnel')) {
      promises.push(
        analyticsService.getFunnelAnalysis(tenantId, timeRange)
          .then(data => ({ key: 'funnel', data }))
          .catch(err => ({ key: 'funnel', error: err.message }))
      );
    }

    if (sections.includes('performance')) {
      promises.push(
        analyticsService.getPerformanceMetrics(tenantId, timeRange)
          .then(data => ({ key: 'performance', data }))
          .catch(err => ({ key: 'performance', error: err.message }))
      );
    }

    if (sections.includes('segments')) {
      promises.push(
        analyticsService.getSegmentAnalytics(tenantId, null, timeRange)
          .then(data => ({ key: 'segments', data }))
          .catch(err => ({ key: 'segments', error: err.message }))
      );
    }

    if (sections.includes('products')) {
      promises.push(
        analyticsService.getProductAnalytics(tenantId, timeRange, 20)
          .then(data => ({ key: 'products', data }))
          .catch(err => ({ key: 'products', error: err.message }))
      );
    }

    if (sections.includes('timeseries')) {
      const metric = req.query.metric || 'users';
      const interval = req.query.interval || 'day';
      promises.push(
        analyticsService.getTimeSeries(tenantId, metric, timeRange, interval)
          .then(data => ({ key: 'timeseries', data }))
          .catch(err => ({ key: 'timeseries', error: err.message }))
      );
    }

    if (sections.includes('characteristics')) {
      promises.push(
        characteristicService.getAllUserCharacteristics(tenantId, { limit: 100, offset: 0 })
          .then(data => ({ key: 'characteristics', data }))
          .catch(err => ({ key: 'characteristics', error: err.message }))
      );
    }

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      if (response.error) {
        results[response.key] = { error: response.error };
      } else {
        results[response.key] = response.data;
      }
    });

    res.json({
      success: true,
      data: results,
      timeRange,
      tenantId
    });
  } catch (error) {
    console.error('❌ Error getting batch analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting batch analytics'
    });
  }
});

/**
 * Genel özet metrikler
 * GET /api/admin/analytics/overview?timeRange=7d
 */
router.get('/overview', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const overview = await analyticsService.getOverview(tenantId, timeRange);

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('❌ Error getting overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting overview analytics'
    });
  }
});

/**
 * Kullanıcı analitikleri
 * GET /api/admin/analytics/users?timeRange=7d
 */
router.get('/users', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const userAnalytics = await analyticsService.getUserAnalytics(tenantId, timeRange);

    res.json({
      success: true,
      data: userAnalytics
    });
  } catch (error) {
    console.error('❌ Error getting user analytics:', error);
    // Servis zaten default değerler döndürüyor, bu yüzden hata olsa bile başarılı yanıt döndürelim
    res.json({
      success: true,
      data: {
        dau: 0,
        wau: 0,
        mau: 0,
        newUsers: 0,
        returningUsers: 0,
        retentionRate: 0,
        churnRate: 0
      }
    });
  }
});

/**
 * Davranış analitikleri
 * GET /api/admin/analytics/behavior?timeRange=7d
 */
router.get('/behavior', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const behaviorAnalytics = await analyticsService.getBehaviorAnalytics(tenantId, timeRange);

    res.json({
      success: true,
      data: behaviorAnalytics
    });
  } catch (error) {
    console.error('❌ Error getting behavior analytics:', error);
    res.json({
      success: true,
      data: {
        screenViews: 0,
        topScreens: [],
        avgTimeOnScreen: 0,
        navigationPaths: [],
        scrollDepth: { avg: 0, max: 0 }
      }
    });
  }
});

/**
 * Funnel analizi
 * GET /api/admin/analytics/funnel?timeRange=7d
 */
router.get('/funnel', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const funnelAnalysis = await analyticsService.getFunnelAnalysis(tenantId, timeRange);

    res.json({
      success: true,
      data: funnelAnalysis
    });
  } catch (error) {
    console.error('❌ Error getting funnel analysis:', error);
    res.json({
      success: true,
      data: {
        funnel: {
          productViews: 0,
          addToCart: 0,
          checkout: 0,
          purchase: 0
        },
        conversionRates: {
          viewToCart: 0,
          cartToCheckout: 0,
          checkoutToPurchase: 0,
          overall: 0
        },
        dropOffPoints: {
          viewToCart: 0,
          cartToCheckout: 0,
          checkoutToPurchase: 0
        }
      }
    });
  }
});

/**
 * Performans metrikleri
 * GET /api/admin/analytics/performance?timeRange=7d
 */
router.get('/performance', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const performanceMetrics = await analyticsService.getPerformanceMetrics(tenantId, timeRange);

    res.json({
      success: true,
      data: performanceMetrics
    });
  } catch (error) {
    console.error('❌ Error getting performance metrics:', error);
    res.json({
      success: true,
      data: {
        pageLoadTime: {
          avg: 0,
          p95: 0,
          p99: 0
        },
        apiResponseTime: {
          avg: 0
        },
        errorRate: 0,
        crashRate: 0
      }
    });
  }
});

/**
 * Segment bazlı analiz
 * GET /api/admin/analytics/segments?segmentId=1&timeRange=7d
 */
router.get('/segments', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const segmentId = req.query.segmentId ? parseInt(req.query.segmentId) : null;
    const timeRange = req.query.timeRange || '7d';

    const segmentAnalytics = await analyticsService.getSegmentAnalytics(tenantId, segmentId, timeRange);

    res.json({
      success: true,
      data: segmentAnalytics
    });
  } catch (error) {
    console.error('❌ Error getting segment analytics:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * Event detayları (filtreleme ile)
 * GET /api/admin/analytics/events?userId=1&eventType=product_view&limit=100&offset=0
 */
router.get('/events', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      eventType: req.query.eventType || null,
      screenName: req.query.screenName || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const events = await analyticsService.getEvents(tenantId, filters, limit, offset);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('❌ Error getting events:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting events'
    });
  }
});

/**
 * Session analizleri
 * GET /api/admin/analytics/sessions?timeRange=7d
 */
router.get('/sessions', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const sessionAnalytics = await analyticsService.getSessionAnalytics(tenantId, timeRange);

    res.json({
      success: true,
      data: sessionAnalytics
    });
  } catch (error) {
    console.error('❌ Error getting session analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting session analytics'
    });
  }
});

/**
 * Ürün etkileşim analizleri
 * GET /api/admin/analytics/products?timeRange=7d&limit=20
 */
router.get('/products', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';
    const limit = parseInt(req.query.limit) || 20;

    const productAnalytics = await analyticsService.getProductAnalytics(tenantId, timeRange, limit);

    res.json({
      success: true,
      data: productAnalytics
    });
  } catch (error) {
    console.error('❌ Error getting product analytics:', error);
    res.json({
      success: true,
      data: {
        topViewed: [],
        topAddedToCart: [],
        topPurchased: []
      }
    });
  }
});

/**
 * Zaman serisi verileri
 * GET /api/admin/analytics/timeseries?metric=users&timeRange=7d&interval=day
 */
router.get('/timeseries', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const metric = req.query.metric || 'users'; // users, sessions, events, revenue
    const timeRange = req.query.timeRange || '7d';
    const interval = req.query.interval || 'day'; // hour, day, week, month

    const timeSeries = await analyticsService.getTimeSeries(tenantId, metric, timeRange, interval);

    res.json({
      success: true,
      data: timeSeries || []
    });
  } catch (error) {
    console.error('❌ Error getting time series:', error);
    // Hata durumunda boş array döndür
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * Kullanıcı karakteristikleri
 * GET /api/admin/analytics/characteristics?userId=1
 * GET /api/admin/analytics/characteristics (tüm kullanıcılar)
 */
router.get('/characteristics', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    if (userId) {
      // Tek kullanıcı karakteristikleri
      const characteristics = await characteristicService.getUserCharacteristics(userId, tenantId);
      res.json({
        success: true,
        data: characteristics
      });
    } else {
      // Tüm kullanıcı karakteristikleri
      const filters = {
        engagementLevel: req.query.engagementLevel || null,
        shoppingStyle: req.query.shoppingStyle || null,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0
      };
      const characteristics = await characteristicService.getAllUserCharacteristics(tenantId, filters);
      res.json({
        success: true,
        data: characteristics || []
      });
    }
  } catch (error) {
    console.error('❌ Error getting characteristics:', error);
    // Hata durumunda boş array döndür
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * Kullanıcı karakteristiklerini yeniden hesapla
 * POST /api/admin/analytics/characteristics/recalculate?userId=1
 */
router.post('/characteristics/recalculate', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const characteristics = await characteristicService.calculateAndSaveUserCharacteristics(
      parseInt(userId),
      tenantId
    );

    res.json({
      success: true,
      data: characteristics,
      message: 'Characteristics recalculated successfully'
    });
  } catch (error) {
    console.error('❌ Error recalculating characteristics:', error);
    res.status(500).json({
      success: false,
      message: 'Error recalculating characteristics'
    });
  }
});

/**
 * Export verileri (CSV/JSON)
 * GET /api/admin/analytics/export?type=csv&format=events&timeRange=7d
 */
router.get('/export', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const type = req.query.type || 'json'; // json, csv
    const format = req.query.format || 'events'; // events, sessions, users
    const timeRange = req.query.timeRange || '7d';

    let data;
    let filename;

    switch (format) {
      case 'events':
        const dateFilter = analyticsService.getDateFilter(timeRange);
        const events = await analyticsService.getEvents(tenantId, {}, 10000, 0);
        data = events.events;
        filename = `analytics-events-${Date.now()}.${type}`;
        break;

      case 'sessions':
        const sessions = await analyticsService.getSessionAnalytics(tenantId, timeRange);
        data = sessions;
        filename = `analytics-sessions-${Date.now()}.${type}`;
        break;

      case 'users':
        const users = await analyticsService.getUserAnalytics(tenantId, timeRange);
        data = users;
        filename = `analytics-users-${Date.now()}.${type}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Use: events, sessions, or users'
        });
    }

    if (type === 'csv') {
      // CSV formatına dönüştür
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else {
      // JSON formatı
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        success: true,
        data: data,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting analytics'
    });
  }
});

/**
 * CSV'ye dönüştür helper
 */
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(values.map(v => `"${v}"`).join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;

