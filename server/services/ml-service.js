const Redis = require('ioredis');
const { poolWrapper } = require('../database-schema');

class MLService {
  constructor() {
    this.redis = null;
    this.queueName = 'ml:events';
    this.initRedis();
  }

  async initRedis() {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ ML Service Redis error:', err.message);
      });

      this.redis.on('ready', () => {
        console.log('✅ ML Service Redis connected');
      });
    } catch (error) {
      console.error('❌ ML Service Redis initialization error:', error);
      this.redis = null;
    }
  }

  /**
   * Send event to ML queue for processing
   */
  async sendEventToML(event) {
    try {
      if (!this.redis) {
        await this.initRedis();
      }

      if (!this.redis) {
        console.warn('⚠️ Redis not available, skipping ML event');
        return false;
      }

      const eventJson = JSON.stringify({
        id: event.id,
        userId: event.userId,
        deviceId: event.deviceId,
        eventType: event.eventType,
        screenName: event.screenName,
        eventData: event.eventData,
        sessionId: event.sessionId,
        timestamp: event.timestamp || new Date().toISOString()
      });

      await this.redis.lpush(this.queueName, eventJson);
      return true;
    } catch (error) {
      console.error('❌ Error sending event to ML queue:', error);
      return false;
    }
  }

  /**
   * Get ML predictions for user (userId optional - if null, returns all)
   */
  async getPredictions(userId = null, tenantId = 1, limit = 50) {
    try {
      let query = `
        SELECT 
          id,
          userId,
          predictionType,
          probability,
          metadata,
          createdAt
        FROM ml_predictions
        WHERE tenantId = ?
      `;
      const params = [tenantId];

      if (userId !== null) {
        query += ` AND userId = ?`;
        params.push(userId);
      }

      query += ` ORDER BY createdAt DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await poolWrapper.execute(query, params);

      return rows.map(row => {
        try {
          return {
            ...row,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {})
          };
        } catch (parseError) {
          console.warn(`⚠️ Error parsing metadata for prediction ${row.id}:`, parseError);
          return {
            ...row,
            metadata: {}
          };
        }
      });
    } catch (error) {
      console.error('❌ Error getting predictions:', error);
      throw error;
    }
  }

  /**
   * Get ML recommendations for user (userId optional - if null, returns all)
   */
  async getRecommendations(userId = null, tenantId = 1, limit = 50) {
    try {
      let query = `
        SELECT 
          id,
          userId,
          productIds,
          scores,
          metadata,
          createdAt,
          updatedAt
        FROM ml_recommendations
        WHERE tenantId = ?
      `;
      const params = [tenantId];

      if (userId !== null) {
        query += ` AND userId = ?`;
        params.push(userId);
      }

      query += ` ORDER BY updatedAt DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await poolWrapper.execute(query, params);

      if (rows.length === 0) {
        return [];
      }

      return rows.map(rec => {
        try {
          return {
            ...rec,
            productIds: rec.productIds ? rec.productIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [],
            scores: rec.scores ? rec.scores.split(',').map(score => parseFloat(score.trim())).filter(score => !isNaN(score)) : [],
            metadata: typeof rec.metadata === 'string' ? JSON.parse(rec.metadata || '{}') : (rec.metadata || {})
          };
        } catch (parseError) {
          console.warn(`⚠️ Error parsing recommendation ${rec.id}:`, parseError);
          return {
            ...rec,
            productIds: [],
            scores: [],
            metadata: {}
          };
        }
      });
    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Get ML anomalies
   */
  async getAnomalies(tenantId = 1, filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          a.id,
          a.eventId,
          a.userId,
          u.name as userName,
          a.anomalyScore,
          a.anomalyType,
          a.metadata,
          a.createdAt
        FROM ml_anomalies a
        LEFT JOIN users u ON a.userId = u.id
        WHERE a.tenantId = ?
      `;
      const params = [tenantId];

      if (filters.userId) {
        query += ` AND a.userId = ?`;
        params.push(filters.userId);
      }

      if (filters.anomalyType) {
        query += ` AND a.anomalyType = ?`;
        params.push(filters.anomalyType);
      }

      if (filters.minScore) {
        query += ` AND a.anomalyScore >= ?`;
        params.push(filters.minScore);
      }

      if (filters.startDate) {
        query += ` AND a.createdAt >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND a.createdAt <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await poolWrapper.execute(query, params);

      // Total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM ml_anomalies a
        WHERE a.tenantId = ?
      `;
      const countParams = [tenantId];

      if (filters.userId) {
        countQuery += ` AND a.userId = ?`;
        countParams.push(filters.userId);
      }

      if (filters.anomalyType) {
        countQuery += ` AND a.anomalyType = ?`;
        countParams.push(filters.anomalyType);
      }

      if (filters.minScore) {
        countQuery += ` AND a.anomalyScore >= ?`;
        countParams.push(filters.minScore);
      }

      if (filters.startDate) {
        countQuery += ` AND a.createdAt >= ?`;
        countParams.push(filters.startDate);
      }

      if (filters.endDate) {
        countQuery += ` AND a.createdAt <= ?`;
        countParams.push(filters.endDate);
      }

      const [countResult] = await poolWrapper.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      return {
        anomalies: rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
        })),
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ Error getting anomalies:', error);
      throw error;
    }
  }

  /**
   * Get ML segments
   */
  async getSegments(tenantId = 1, filters = {}) {
    try {
      let query = `
        SELECT 
          segmentId,
          segmentName,
          COUNT(*) as userCount,
          AVG(confidence) as avgConfidence
        FROM ml_segments
        WHERE tenantId = ?
      `;
      const params = [tenantId];

      if (filters.segmentId) {
        query += ` AND segmentId = ?`;
        params.push(filters.segmentId);
      }

      query += ` GROUP BY segmentId, segmentName ORDER BY userCount DESC`;

      const [rows] = await poolWrapper.execute(query, params);

      return rows;
    } catch (error) {
      console.error('❌ Error getting segments:', error);
      throw error;
    }
  }

  /**
   * Get user segment
   */
  async getUserSegment(userId, tenantId = 1) {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          segmentId,
          segmentName,
          confidence,
          metadata,
          updatedAt
        FROM ml_segments
        WHERE userId = ? AND tenantId = ?
        ORDER BY updatedAt DESC
        LIMIT 1
      `, [userId, tenantId]);

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        metadata: typeof rows[0].metadata === 'string' ? JSON.parse(rows[0].metadata || '{}') : rows[0].metadata
      };
    } catch (error) {
      console.error('❌ Error getting user segment:', error);
      throw error;
    }
  }

  /**
   * Get ML models status
   */
  async getModelsStatus() {
    try {
      const [rows] = await poolWrapper.execute(`
        SELECT 
          id,
          modelName,
          modelType,
          version,
          status,
          filePath,
          accuracy,
          \`precision\`,
          recall,
          f1Score,
          trainingDataSize,
          trainingDuration,
          hyperparameters,
          metadata,
          deployedAt,
          createdAt,
          updatedAt
        FROM ml_models
        ORDER BY updatedAt DESC
      `);

      return rows.map(row => {
        try {
          return {
            ...row,
            hyperparameters: row.hyperparameters 
              ? (typeof row.hyperparameters === 'string' 
                  ? JSON.parse(row.hyperparameters || '{}') 
                  : row.hyperparameters)
              : {},
            metadata: row.metadata 
              ? (typeof row.metadata === 'string' 
                  ? JSON.parse(row.metadata || '{}') 
                  : row.metadata)
              : {}
          };
        } catch (parseError) {
          // JSON parse hatası durumunda boş obje döndür
          console.warn(`⚠️ Error parsing JSON for model ${row.id}:`, parseError);
          return {
            ...row,
            hyperparameters: {},
            metadata: {}
          };
        }
      });
    } catch (error) {
      console.error('❌ Error getting models status:', error);
      // Hata durumunda boş array döndür, 500 hatası verme
      console.warn('⚠️ Returning empty array due to error');
      return [];
    }
  }

  /**
   * Get ML statistics
   */
  async getStatistics(tenantId = 1, timeRange = '7d') {
    try {
      const dateValue = this.getDateFilter(timeRange);

      const [
        totalPredictions,
        totalRecommendations,
        totalAnomalies,
        avgPredictionProbability,
        topAnomalyTypes
      ] = await Promise.all([
        this.getTotalPredictions(tenantId, dateValue),
        this.getTotalRecommendations(tenantId, dateValue),
        this.getTotalAnomalies(tenantId, dateValue),
        this.getAvgPredictionProbability(tenantId, dateValue),
        this.getTopAnomalyTypes(tenantId, dateValue)
      ]);

      return {
        totalPredictions,
        totalRecommendations,
        totalAnomalies,
        avgPredictionProbability,
        topAnomalyTypes
      };
    } catch (error) {
      console.error('❌ Error getting ML statistics:', error);
      throw error;
    }
  }

  getDateFilter(timeRange) {
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
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // SQL Injection koruması: Artık sadece date value döndürüyoruz
    return startDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  async getTotalPredictions(tenantId, dateValue) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_predictions
      WHERE tenantId = ? AND createdAt >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getTotalRecommendations(tenantId, dateValue) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_recommendations
      WHERE tenantId = ? AND updatedAt >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getTotalAnomalies(tenantId, dateValue) {
    const [rows] = await poolWrapper.execute(`
      SELECT COUNT(*) as count
      FROM ml_anomalies
      WHERE tenantId = ? AND createdAt >= ?
    `, [tenantId, dateValue]);
    return rows[0]?.count || 0;
  }

  async getAvgPredictionProbability(tenantId, dateValue) {
    const [rows] = await poolWrapper.execute(`
      SELECT AVG(probability) as avg
      FROM ml_predictions
      WHERE tenantId = ? AND createdAt >= ?
    `, [tenantId, dateValue]);
    return parseFloat(rows[0]?.avg || 0);
  }

  async getTopAnomalyTypes(tenantId, dateValue, limit = 5) {
    const [rows] = await poolWrapper.execute(`
      SELECT 
        anomalyType,
        COUNT(*) as count
      FROM ml_anomalies
      WHERE tenantId = ? AND createdAt >= ?
      GROUP BY anomalyType
      ORDER BY count DESC
      LIMIT ?
    `, [tenantId, dateValue, limit]);
    return rows;
  }
}

module.exports = new MLService();

