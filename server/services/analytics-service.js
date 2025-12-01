const { poolWrapper } = require('../database-schema');

class AnalyticsService {
  constructor() {
    this.pool = poolWrapper;
  }

  /**
   * Promise'leri batch'ler halinde çalıştır (queue limit hatası için)
   * @param {Array} promises - Çalıştırılacak promise'ler
   * @param {number} batchSize - Her batch'te kaç promise çalışacak (default: 1 - tamamen sıralı)
   * @returns {Promise<Array>} - Tüm promise'lerin sonuçları
   */
  async executeInBatches(promises, batchSize = 1) {
    const results = [];
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      // Batch size 1 ise Promise.all yerine sıralı çalıştır
      if (batchSize === 1) {
        const result = await batch[0];
        results.push(result);
      } else {
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
      }
      // Her sorgu arasında delay (queue limit hatası için)
      if (i + batchSize < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 50ms → 100ms
      }
    }
    return results;
  }

  /**
   * Genel özet metrikler
   */
  async getOverview(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const promises = [
        this.getTotalUsers(tenantId, dateValue).catch(() => 0),
        this.getActiveUsers(tenantId, dateValue).catch(() => 0),
        this.getTotalSessions(tenantId, dateValue).catch(() => 0),
        this.getTotalEvents(tenantId, dateValue).catch(() => 0),
        this.getTotalRevenue(tenantId, dateValue).catch(() => 0),
        this.getAvgSessionDuration(tenantId, dateValue).catch(() => 0),
        this.getBounceRate(tenantId, dateValue).catch(() => 0)
      ];
      
      const [
        totalUsers,
        activeUsers,
        totalSessions,
        totalEvents,
        totalRevenue,
        avgSessionDuration,
        bounceRate
      ] = await this.executeInBatches(promises, 1); // Batch size: 2 → 1 (tamamen sıralı)

      return {
        totalUsers,
        activeUsers,
        totalSessions,
        totalEvents,
        totalRevenue,
        avgSessionDuration,
        bounceRate,
        timeRange
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting overview:', error);
      }
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSessions: 0,
        totalEvents: 0,
        totalRevenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        timeRange
      };
    }
  }

  /**
   * Kullanıcı analitikleri
   */
  async getUserAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const promises = [
        this.getDAU(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting DAU:', err.message);
          }
          return 0;
        }),
        this.getWAU(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting WAU:', err.message);
          }
          return 0;
        }),
        this.getMAU(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting MAU:', err.message);
          }
          return 0;
        }),
        this.getNewUsers(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting new users:', err.message);
          }
          return 0;
        }),
        this.getReturningUsers(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting returning users:', err.message);
          }
          return 0;
        }),
        this.getRetentionRate(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting retention rate:', err.message);
          }
          return 0;
        }),
        this.getChurnRate(tenantId, dateValue).catch(err => {
          if (err.message && !err.message.includes('Pool is closed')) {
            console.warn('⚠️ Error getting churn rate:', err.message);
          }
          return 0;
        })
      ];
      
      const [
        dau,
        wau,
        mau,
        newUsers,
        returningUsers,
        retentionRate,
        churnRate
      ] = await this.executeInBatches(promises, 1); // Batch size: 2 → 1 (tamamen sıralı)

      return {
        dau: dau || 0,
        wau: wau || 0,
        mau: mau || 0,
        newUsers: newUsers || 0,
        returningUsers: returningUsers || 0,
        retentionRate: retentionRate || 0,
        churnRate: churnRate || 0
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting user analytics:', error);
      }
      // Hata durumunda default değerler döndür
      return {
        dau: 0,
        wau: 0,
        mau: 0,
        newUsers: 0,
        returningUsers: 0,
        retentionRate: 0,
        churnRate: 0
      };
    }
  }

  /**
   * Davranış analitikleri
   */
  async getBehaviorAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const [
        screenViews,
        topScreens,
        avgTimeOnScreen,
        navigationPaths,
        scrollDepth
      ] = await Promise.all([
        this.getScreenViews(tenantId, dateValue).catch(() => 0),
        this.getTopScreens(tenantId, dateValue).catch(() => []),
        this.getAvgTimeOnScreen(tenantId, dateValue).catch(() => 0),
        this.getNavigationPaths(tenantId, dateValue).catch(() => []),
        this.getScrollDepth(tenantId, dateValue).catch(() => ({ avg: 0, max: 0 }))
      ]);

      return {
        screenViews,
        topScreens,
        avgTimeOnScreen,
        navigationPaths,
        scrollDepth
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting behavior analytics:', error);
      }
      return {
        screenViews: 0,
        topScreens: [],
        avgTimeOnScreen: 0,
        navigationPaths: [],
        scrollDepth: { avg: 0, max: 0 }
      };
    }
  }

  /**
   * Funnel analizi
   */
  async getFunnelAnalysis(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const promises = [
        this.getProductViews(tenantId, dateValue).catch(() => 0),
        this.getAddToCart(tenantId, dateValue).catch(() => 0),
        this.getCheckout(tenantId, dateValue).catch(() => 0),
        this.getPurchase(tenantId, dateValue).catch(() => 0)
      ];
      
      const [
        productViews,
        addToCart,
        checkout,
        purchase
      ] = await this.executeInBatches(promises, 1); // Batch size: 2 → 1 (tamamen sıralı)

      const viewToCartRate = productViews > 0 ? (addToCart / productViews) * 100 : 0;
      const cartToCheckoutRate = addToCart > 0 ? (checkout / addToCart) * 100 : 0;
      const checkoutToPurchaseRate = checkout > 0 ? (purchase / checkout) * 100 : 0;
      const overallConversionRate = productViews > 0 ? (purchase / productViews) * 100 : 0;

      return {
        funnel: {
          productViews,
          addToCart,
          checkout,
          purchase
        },
        conversionRates: {
          viewToCart: viewToCartRate,
          cartToCheckout: cartToCheckoutRate,
          checkoutToPurchase: checkoutToPurchaseRate,
          overall: overallConversionRate
        },
        dropOffPoints: {
          viewToCart: productViews - addToCart,
          cartToCheckout: addToCart - checkout,
          checkoutToPurchase: checkout - purchase
        }
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting funnel analysis:', error);
      }
      return {
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
      };
    }
  }

  /**
   * Performans metrikleri
   */
  async getPerformanceMetrics(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const promises = [
        this.getAvgPageLoadTime(tenantId, dateValue).catch(() => 0),
        this.getP95PageLoadTime(tenantId, dateValue).catch(() => 0),
        this.getP99PageLoadTime(tenantId, dateValue).catch(() => 0),
        this.getAvgApiResponseTime(tenantId, dateValue).catch(() => 0),
        this.getErrorRate(tenantId, dateValue).catch(() => 0),
        this.getCrashRate(tenantId, dateValue).catch(() => 0)
      ];
      
      const [
        avgPageLoadTime,
        p95PageLoadTime,
        p99PageLoadTime,
        avgApiResponseTime,
        errorRate,
        crashRate
      ] = await this.executeInBatches(promises, 1); // Batch size: 2 → 1 (tamamen sıralı)

      return {
        pageLoadTime: {
          avg: avgPageLoadTime,
          p95: p95PageLoadTime,
          p99: p99PageLoadTime
        },
        apiResponseTime: {
          avg: avgApiResponseTime
        },
        errorRate,
        crashRate
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting performance metrics:', error);
      }
      return {
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
      };
    }
  }

  /**
   * Segment bazlı analiz
   */
  async getSegmentAnalytics(tenantId, segmentId = null, timeRange = '7d') {
    try {
      // SQL Injection koruması: Parametreli sorgu kullan
      const dateValue = this.getDateFilter(timeRange);
      const params = [tenantId, dateValue];
      let segmentCondition = '';
      if (segmentId) {
        segmentCondition = 'AND us.segmentId = ?';
        params.push(segmentId);
      }
      
      const [rows] = await this.pool.execute(`
        SELECT 
          s.id as segmentId,
          s.name as segmentName,
          COUNT(DISTINCT us.userId) as userCount,
          COUNT(DISTINCT o.id) as orderCount,
          COALESCE(SUM(o.totalAmount), 0) as totalRevenue,
          COALESCE(AVG(o.totalAmount), 0) as avgOrderValue
        FROM segments s
        LEFT JOIN user_segments us ON s.id = us.segmentId AND s.tenantId = us.tenantId
        LEFT JOIN orders o ON us.userId = o.userId AND s.tenantId = o.tenantId AND o.createdAt >= ?
        WHERE s.tenantId = ? ${segmentCondition}
        GROUP BY s.id, s.name
      `, [dateValue, tenantId, ...(segmentId ? [segmentId] : [])]);

      return rows || [];
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting segment analytics:', error);
      }
      return [];
    }
  }

  /**
   * Event detayları (filtreleme ile)
   */
  async getEvents(tenantId, filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          ube.id,
          ube.userId,
          u.name as userName,
          ube.deviceId,
          ube.eventType,
          ube.screenName,
          ube.eventData,
          ube.sessionId,
          ube.timestamp,
          ube.ipAddress
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL)
      `;
      const params = [tenantId];

      if (filters.userId) {
        query += ` AND ube.userId = ?`;
        params.push(filters.userId);
      }

      if (filters.eventType) {
        query += ` AND ube.eventType = ?`;
        params.push(filters.eventType);
      }

      if (filters.screenName) {
        query += ` AND ube.screenName = ?`;
        params.push(filters.screenName);
      }

      if (filters.startDate) {
        query += ` AND ube.timestamp >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND ube.timestamp <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY ube.timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await this.pool.execute(query, params);

      // Total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL)
      `;
      const countParams = [tenantId];

      if (filters.userId) {
        countQuery += ` AND ube.userId = ?`;
        countParams.push(filters.userId);
      }

      if (filters.eventType) {
        countQuery += ` AND ube.eventType = ?`;
        countParams.push(filters.eventType);
      }

      if (filters.screenName) {
        countQuery += ` AND ube.screenName = ?`;
        countParams.push(filters.screenName);
      }

      if (filters.startDate) {
        countQuery += ` AND ube.timestamp >= ?`;
        countParams.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ` AND ube.timestamp <= ?`;
        countParams.push(filters.endDate);
      }

      const [countResult] = await this.pool.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        events: rows,
        total,
        limit,
        offset
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting events:', error);
      }
      throw error;
    }
  }

  /**
   * Session analizleri
   */
  async getSessionAnalytics(tenantId, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      const [
        totalSessions,
        avgSessionDuration,
        avgPageViewsPerSession,
        sessionsPerUser,
        returningVsNew
      ] = await Promise.all([
        this.getTotalSessions(tenantId, dateValue),
        this.getAvgSessionDuration(tenantId, dateValue),
        this.getAvgPageViewsPerSession(tenantId, dateValue),
        this.getSessionsPerUser(tenantId, dateValue),
        this.getReturningVsNew(tenantId, dateValue)
      ]);

      return {
        totalSessions,
        avgSessionDuration,
        avgPageViewsPerSession,
        sessionsPerUser,
        returningVsNew
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting session analytics:', error);
      }
      throw error;
    }
  }

  /**
   * Ürün etkileşim analizleri
   */
  async getProductAnalytics(tenantId, timeRange = '7d', limit = 20) {
    try {
      const dateValue = this.getDateFilter(timeRange);
      
      // En çok görüntülenen ürünler
      const [topViewed] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(*) as viewCount
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        LEFT JOIN users u ON ube.userId = u.id
        WHERE ube.eventType = 'product_view' 
          AND ube.timestamp >= ?
          AND p.tenantId = ?
          AND (u.tenantId = ? OR ube.userId IS NULL)
        GROUP BY p.id, p.name
        ORDER BY viewCount DESC
        LIMIT ?
      `, [tenantId, tenantId, limit]).catch(() => [[]]);

      // En çok sepete eklenen ürünler
      const [topAddedToCart] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(*) as addToCartCount
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        LEFT JOIN users u ON ube.userId = u.id
        WHERE ube.eventType = 'add_to_cart' 
          AND ube.timestamp >= ?
          AND p.tenantId = ?
          AND (u.tenantId = ? OR ube.userId IS NULL)
        GROUP BY p.id, p.name
        ORDER BY addToCartCount DESC
        LIMIT ?
      `, [tenantId, tenantId, limit]).catch(() => [[]]);

      // En çok satın alınan ürünler
      const [topPurchased] = await this.pool.execute(`
        SELECT 
          p.id,
          p.name,
          COUNT(DISTINCT oi.orderId) as purchaseCount,
          SUM(oi.quantity) as totalQuantity,
          SUM(oi.price * oi.quantity) as totalRevenue
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        JOIN orders o ON oi.orderId = o.id
        WHERE o.createdAt >= ?
          AND p.tenantId = ?
        GROUP BY p.id, p.name
        ORDER BY purchaseCount DESC
        LIMIT ?
      `, [tenantId, limit]).catch(() => [[]]);

      return {
        topViewed: topViewed || [],
        topAddedToCart: topAddedToCart || [],
        topPurchased: topPurchased || []
      };
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting product analytics:', error);
      }
      return {
        topViewed: [],
        topAddedToCart: [],
        topPurchased: []
      };
    }
  }

  /**
   * Zaman serisi verileri
   */
  async getTimeSeries(tenantId, metric = 'users', timeRange = '7d', interval = 'day') {
    try {
      const dateValue = this.getDateFilter(timeRange);
      // DATE_FORMAT için format string'i direkt SQL'e yazmalıyız (parametre olarak geçilemez)
      const dateFormat = interval === 'hour' ? '%Y-%m-%d %H:00:00' : 
                         interval === 'day' ? '%Y-%m-%d' : 
                         interval === 'week' ? '%Y-%u' : '%Y-%m';

      let query;
      const params = [tenantId];

      switch (metric) {
        case 'users':
          query = `
            SELECT 
              DATE_FORMAT(ube.timestamp, '${dateFormat}') as date,
              COUNT(DISTINCT ube.userId) as value
            FROM user_behavior_events ube
            LEFT JOIN users u ON ube.userId = u.id
            WHERE ube.timestamp >= ?
              AND (u.tenantId = ? OR ube.userId IS NULL)
            GROUP BY DATE_FORMAT(ube.timestamp, '${dateFormat}')
            ORDER BY date ASC
          `;
          params.push(tenantId);
          break;

        case 'sessions':
          query = `
            SELECT 
              DATE_FORMAT(us.startTime, '${dateFormat}') as date,
              COUNT(*) as value
            FROM user_sessions us
            LEFT JOIN users u ON us.userId = u.id
            WHERE us.startTime >= ?
              AND (u.tenantId = ? OR us.userId IS NULL)
            GROUP BY DATE_FORMAT(us.startTime, '${dateFormat}')
            ORDER BY date ASC
          `;
          params.push(tenantId);
          break;

        case 'events':
          query = `
            SELECT 
              DATE_FORMAT(ube.timestamp, '${dateFormat}') as date,
              COUNT(*) as value
            FROM user_behavior_events ube
            LEFT JOIN users u ON ube.userId = u.id
            WHERE ube.timestamp >= ?
              AND (u.tenantId = ? OR ube.userId IS NULL)
            GROUP BY DATE_FORMAT(ube.timestamp, '${dateFormat}')
            ORDER BY date ASC
          `;
          params.push(tenantId);
          break;

        case 'revenue':
          query = `
            SELECT 
              DATE_FORMAT(createdAt, '${dateFormat}') as date,
              COALESCE(SUM(totalAmount), 0) as value
            FROM orders
            WHERE createdAt >= ?
              AND tenantId = ?
            GROUP BY DATE_FORMAT(createdAt, '${dateFormat}')
            ORDER BY date ASC
          `;
          params.push(tenantId);
          break;

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      const [rows] = await this.pool.execute(query, params);
      return rows || [];
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error getting time series:', error);
        console.error('Query:', query);
        console.error('Params:', params);
      }
      // Hata durumunda boş array döndür
      return [];
    }
  }

  // Helper methods

  getDateFilter(timeRange) {
    try {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        case '1m':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // SQL Injection koruması: Artık sadece date value döndürüyoruz
      // MySQL datetime formatı: 'YYYY-MM-DD HH:MM:SS'
      const formattedDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
      return formattedDate;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error in getDateFilter:', error);
      }
      // Default olarak son 7 gün
      const defaultDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const formattedDate = defaultDate.toISOString().slice(0, 19).replace('T', ' ');
      return formattedDate;
    }
  }

  async getTotalUsers(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT ube.userId) as count
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL) AND ube.timestamp >= ?
      `, [tenantId, dateValue]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getTotalUsers:', error.message);
      }
      return 0;
    }
  }

  async getActiveUsers(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT us.userId) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ?
      `, [tenantId, dateValue]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getActiveUsers:', error.message);
      }
      return 0;
    }
  }

  async getTotalSessions(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(*) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ?
      `, [tenantId, dateValue]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getTotalSessions:', error.message);
      }
      return 0;
    }
  }

  async getTotalEvents(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(*) as count
        FROM user_behavior_events ube
        LEFT JOIN users u ON ube.userId = u.id
        WHERE (u.tenantId = ? OR ube.userId IS NULL) AND ube.timestamp >= ?
      `, [tenantId, dateValue]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getTotalEvents:', error.message);
      }
      return 0;
    }
  }

  async getTotalRevenue(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COALESCE(SUM(totalAmount), 0) as total
        FROM orders
        WHERE tenantId = ? AND createdAt >= ?
      `, [tenantId, dateValue]);
      return parseFloat(rows[0]?.total || 0);
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getTotalRevenue:', error.message);
      }
      return 0;
    }
  }

  async getAvgSessionDuration(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT AVG(us.duration) as avg
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ? AND us.duration > 0
      `, [tenantId, dateValue]);
      return Math.round(rows[0]?.avg || 0);
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getAvgSessionDuration:', error.message);
      }
      return 0;
    }
  }

  async getBounceRate(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN us.pageCount = 1 THEN 1 ELSE 0 END) as bounced
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ?
      `, [tenantId, dateValue]);
      
      const total = rows[0]?.total || 0;
      const bounced = rows[0]?.bounced || 0;
      return total > 0 ? (bounced / total) * 100 : 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getBounceRate:', error.message);
      }
      return 0;
    }
  }

  async getDAU(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT us.userId) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) 
          AND DATE(us.startTime) = CURDATE()
          AND us.userId IS NOT NULL
      `, [tenantId]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getDAU:', error.message);
      }
      return 0;
    }
  }

  async getWAU(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT us.userId) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) 
          AND us.startTime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND us.userId IS NOT NULL
      `, [tenantId]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getWAU:', error.message);
      }
      return 0;
    }
  }

  async getMAU(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT us.userId) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL) 
          AND us.startTime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND us.userId IS NOT NULL
      `, [tenantId]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getMAU:', error.message);
      }
      return 0;
    }
  }

  async getNewUsers(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT u.id) as count
        FROM users u
        WHERE u.tenantId = ? AND u.createdAt >= ?
      `, [tenantId, dateValue]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getNewUsers:', error.message);
      }
      return 0;
    }
  }

  async getReturningUsers(tenantId, dateValue) {
    try {
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT us.userId) as count
        FROM user_sessions us
        LEFT JOIN users u ON us.userId = u.id
        WHERE (u.tenantId = ? OR us.userId IS NULL)
          AND us.startTime >= ?
          AND us.userId IS NOT NULL
          AND us.userId IN (
            SELECT DISTINCT us2.userId 
            FROM user_sessions us2
            LEFT JOIN users u2 ON us2.userId = u2.id
            WHERE (u2.tenantId = ? OR us2.userId IS NULL)
              AND us2.startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
          )
      `, [tenantId, dateValue, tenantId]);
      return rows[0]?.count || 0;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getReturningUsers:', error.message);
      }
      return 0;
    }
  }

  async getRetentionRate(tenantId, dateValue) {
    try {
      // Basit retention hesaplama - gerçek retention daha karmaşık olabilir
      const newUsers = await this.getNewUsers(tenantId, dateValue);
      const returningUsers = await this.getReturningUsers(tenantId, dateValue);
      const totalActive = newUsers + returningUsers;
      return totalActive > 0 ? (returningUsers / totalActive) * 100 : 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getRetentionRate:', error.message);
      }
      return 0;
    }
  }

  async getChurnRate(tenantId, dateValue) {
    try {
      // Churn rate hesaplama - son 30 günde aktif olan ama son 7 günde aktif olmayan kullanıcılar
      const [rows] = await this.pool.execute(`
        SELECT COUNT(DISTINCT u.id) as count
        FROM users u
        WHERE u.tenantId = ?
          AND u.id IN (
            SELECT DISTINCT us.userId 
            FROM user_sessions us
            LEFT JOIN users u2 ON us.userId = u2.id
            WHERE (u2.tenantId = ? OR us.userId IS NULL)
              AND us.startTime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND us.startTime < DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND us.userId IS NOT NULL
          )
          AND u.id NOT IN (
            SELECT DISTINCT us.userId 
            FROM user_sessions us
            LEFT JOIN users u3 ON us.userId = u3.id
            WHERE (u3.tenantId = ? OR us.userId IS NULL)
              AND us.startTime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND us.userId IS NOT NULL
          )
      `, [tenantId, tenantId, tenantId]);
      return rows[0]?.count || 0;
    } catch (error) {
      if (error.message && !error.message.includes('Pool is closed')) {
        console.warn('⚠️ Error in getChurnRate:', error.message);
      }
      return 0;
    }
  }

  async getScreenViews(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getTopScreens(tenantId, dateValue, limit = 10) {
    const [rows] = await this.pool.execute(`
      SELECT 
        ube.screenName,
        COUNT(*) as viewCount
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp >= ?
        AND ube.screenName IS NOT NULL
      GROUP BY ube.screenName
      ORDER BY viewCount DESC
      LIMIT ?
    `, [tenantId, dateValue, limit]);
    return rows;
  }

  async getAvgTimeOnScreen(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.timeOnScreen')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'screen_view' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.timeOnScreen') IS NOT NULL
    `, [tenantId, dateValue]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getNavigationPaths(tenantId, dateValue, limit = 10) {
    // Basit navigation path analizi
    const [rows] = await this.pool.execute(`
      SELECT 
        JSON_EXTRACT(ube.eventData, '$.navigationPath') as path,
        COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'navigation' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.navigationPath') IS NOT NULL
      GROUP BY JSON_EXTRACT(ube.eventData, '$.navigationPath')
      ORDER BY count DESC
      LIMIT ?
    `, [tenantId, dateValue, limit]);
    return rows;
  }

  async getScrollDepth(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT 
        AVG(JSON_EXTRACT(ube.eventData, '$.scrollDepth')) as avg,
        MAX(JSON_EXTRACT(ube.eventData, '$.scrollDepth')) as max
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'scroll' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.scrollDepth') IS NOT NULL
    `, [tenantId, dateValue]);
    return {
      avg: Math.round(rows[0]?.avg || 0),
      max: Math.round(rows[0]?.max || 0)
    };
  }

  async getProductViews(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'product_view' 
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getAddToCart(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'add_to_cart' 
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getCheckout(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'checkout_start' 
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getPurchase(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE tenantId = ? 
        AND createdAt >= ?
        AND status = 'completed'
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getAvgPageLoadTime(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.pageLoadTime')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
    `, [tenantId, dateValue]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getP95PageLoadTime(tenantId, dateValue) {
    // P95 hesaplama için tüm değerleri alıp sıralayacağız
    const [rows] = await this.pool.execute(`
      SELECT JSON_EXTRACT(ube.eventData, '$.pageLoadTime') as loadTime
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
      ORDER BY JSON_EXTRACT(ube.eventData, '$.pageLoadTime')
    `, [tenantId, dateValue]);
    
    if (rows.length === 0) return 0;
    const index = Math.floor(rows.length * 0.95);
    return Math.round(rows[index]?.loadTime || 0);
  }

  async getP99PageLoadTime(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT JSON_EXTRACT(ube.eventData, '$.pageLoadTime') as loadTime
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.pageLoadTime') IS NOT NULL
      ORDER BY JSON_EXTRACT(ube.eventData, '$.pageLoadTime')
    `, [tenantId, dateValue]);
    
    if (rows.length === 0) return 0;
    const index = Math.floor(rows.length * 0.99);
    return Math.round(rows[index]?.loadTime || 0);
  }

  async getAvgApiResponseTime(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(JSON_EXTRACT(ube.eventData, '$.apiResponseTime')) as avg
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'performance' 
        AND ube.timestamp >= ?
        AND JSON_EXTRACT(ube.eventData, '$.apiResponseTime') IS NOT NULL
    `, [tenantId, dateValue]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getErrorRate(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ube.eventType = 'error' THEN 1 ELSE 0 END) as errors
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    
    const total = rows[0]?.total || 0;
    const errors = rows[0]?.errors || 0;
    return total > 0 ? (errors / total) * 100 : 0;
  }

  async getCrashRate(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT COUNT(*) as count
      FROM user_behavior_events ube
      LEFT JOIN users u ON ube.userId = u.id
      WHERE (u.tenantId = ? OR ube.userId IS NULL)
        AND ube.eventType = 'crash' 
        AND ube.timestamp >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getAvgPageViewsPerSession(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT AVG(us.pageCount) as avg
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ? AND us.pageCount > 0
    `, [tenantId, dateValue]);
    return Math.round(rows[0]?.avg || 0);
  }

  async getSessionsPerUser(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(DISTINCT us.userId) as users,
        COUNT(*) as sessions
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ? AND us.userId IS NOT NULL
    `, [tenantId, dateValue]);
    
    const users = rows[0]?.users || 0;
    const sessions = rows[0]?.sessions || 0;
    return users > 0 ? (sessions / users).toFixed(2) : 0;
  }

  async getReturningVsNew(tenantId, dateValue) {
    const [rows] = await this.pool.execute(`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN us.userId IN (
            SELECT DISTINCT us2.userId 
            FROM user_sessions us2
            LEFT JOIN users u2 ON us2.userId = u2.id
            WHERE (u2.tenantId = ? OR us2.userId IS NULL)
              AND us2.startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
          ) THEN us.userId 
        END) as returning,
        COUNT(DISTINCT CASE 
          WHEN us.userId NOT IN (
            SELECT DISTINCT us2.userId 
            FROM user_sessions us2
            LEFT JOIN users u2 ON us2.userId = u2.id
            WHERE (u2.tenantId = ? OR us2.userId IS NULL)
              AND us2.startTime < DATE_SUB(NOW(), INTERVAL 1 DAY)
          ) THEN us.userId 
        END) as new
      FROM user_sessions us
      LEFT JOIN users u ON us.userId = u.id
      WHERE (u.tenantId = ? OR us.userId IS NULL) AND us.startTime >= ? AND us.userId IS NOT NULL
    `, [tenantId, tenantId, tenantId]);
    
    return {
      returning: rows[0]?.returning || 0,
      new: rows[0]?.new || 0
    };
  }
}

module.exports = AnalyticsService;

