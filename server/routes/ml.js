const express = require('express');
const router = express.Router();
const mlService = require('../services/ml-service');
const { authenticateAdmin } = require('../middleware/auth');
const { poolWrapper } = require('../database-schema');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * Get ML predictions
 * GET /api/admin/ml/predictions?userId=1&limit=10 (userId optional)
 */
router.get('/predictions', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // userId opsiyonel - yoksa tüm predictions'ı getir
    const predictions = await mlService.getPredictions(userId, tenantId, limit);
    
    console.log('🔮 ML Predictions response:', JSON.stringify({
      userId,
      tenantId,
      limit,
      predictionsCount: predictions ? predictions.length : 0,
      predictions: predictions?.slice(0, 3) // İlk 3'ünü göster
    }, null, 2));

    res.json({
      success: true,
      data: predictions || []
    });
  } catch (error) {
    console.error('❌ Error getting predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting predictions'
    });
  }
});

/**
 * Get ML recommendations
 * GET /api/admin/ml/recommendations?userId=1 (userId optional)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // userId opsiyonel - yoksa tüm recommendations'ı getir
    const recommendations = await mlService.getRecommendations(userId, tenantId, limit);
    
    console.log('🛍️ ML Recommendations response:', JSON.stringify({
      userId,
      tenantId,
      limit,
      recommendationsCount: recommendations ? recommendations.length : 0,
      recommendations: recommendations?.slice(0, 3) // İlk 3'ünü göster
    }, null, 2));

    res.json({
      success: true,
      data: recommendations || []
    });
  } catch (error) {
    console.error('❌ Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting recommendations'
    });
  }
});

/**
 * Get ML anomalies
 * GET /api/admin/ml/anomalies?anomalyType=bot&limit=100&offset=0
 */
router.get('/anomalies', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      anomalyType: req.query.anomalyType || null,
      minScore: req.query.minScore ? parseFloat(req.query.minScore) : null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const result = await mlService.getAnomalies(tenantId, filters, limit, offset);
    
    console.log('⚠️ ML Anomalies response:', JSON.stringify({
      tenantId,
      filters,
      limit,
      offset,
      anomaliesCount: result?.anomalies ? result.anomalies.length : 0,
      total: result?.total || 0,
      anomalies: result?.anomalies?.slice(0, 3) // İlk 3'ünü göster
    }, null, 2));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error getting anomalies:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting anomalies'
    });
  }
});

/**
 * Get ML segments
 * GET /api/admin/ml/segments?segmentId=1
 */
router.get('/segments', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const filters = {
      segmentId: req.query.segmentId ? parseInt(req.query.segmentId) : null
    };

    const segments = await mlService.getSegments(tenantId, filters);
    
    console.log('👥 ML Segments response:', JSON.stringify({
      tenantId,
      filters,
      segmentsCount: segments ? segments.length : 0,
      segments: segments
    }, null, 2));

    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('❌ Error getting segments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting segments'
    });
  }
});

/**
 * Get user segment
 * GET /api/admin/ml/segments/user?userId=1
 */
router.get('/segments/user', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const segment = await mlService.getUserSegment(userId, tenantId);

    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    console.error('❌ Error getting user segment:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user segment'
    });
  }
});

/**
 * Get ML models status
 * GET /api/admin/ml/models
 */
router.get('/models', async (req, res) => {
  try {
    const models = await mlService.getModelsStatus();
    
    console.log('🤖 ML Models response:', JSON.stringify({
      modelsCount: models ? models.length : 0,
      models: models
    }, null, 2));

    // getModelsStatus() artık hata durumunda boş array döndürüyor
    // Bu normal bir durum, 500 hatası verme
    res.json({
      success: true,
      data: models || []
    });
  } catch (error) {
    console.error('❌ Error getting models status:', error);
    // Hata durumunda bile boş array döndür, frontend'in çökmesini önle
    res.json({
      success: true,
      data: [],
      warning: 'Could not load models status, returning empty array'
    });
  }
});

/**
 * Get ML statistics
 * GET /api/admin/ml/statistics?timeRange=7d
 */
router.get('/statistics', async (req, res) => {
  try {
    const tenantId = parseInt(req.query.tenantId) || parseInt(req.headers['x-tenant-id']) || 1;
    const timeRange = req.query.timeRange || '7d';

    const statistics = await mlService.getStatistics(tenantId, timeRange);
    
    console.log('📊 ML Statistics response:', JSON.stringify({
      tenantId,
      timeRange,
      statisticsCount: statistics ? Object.keys(statistics).length : 0,
      statistics: statistics
    }, null, 2));

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('❌ Error getting ML statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting ML statistics'
    });
  }
});

/**
 * Trigger model training
 * POST /api/admin/ml/train
 */
router.post('/train', async (req, res) => {
  try {
    const { modelType, days } = req.body;

    if (!modelType) {
      return res.status(400).json({
        success: false,
        message: 'modelType is required'
      });
    }

    // ML Service URL - environment variable veya default
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    
    console.log(`🚀 ML eğitim isteği: ${modelType} -> ${ML_SERVICE_URL}/api/models/train`);
    
    // ML servisine istek gönder (Node.js 18+ built-in fetch kullanıyoruz)
    const response = await fetch(`${ML_SERVICE_URL}/api/models/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_type: modelType,
        days: days || 30
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ML servisi hatası (${response.status}):`, errorText);
      throw new Error(`ML servisi hatası: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`✅ ML eğitim başlatıldı: ${modelType}`, result);
    
    res.json({
      success: true,
      message: `Training started for ${modelType}`,
      model_type: modelType,
      status: 'training',
      ml_service_response: result
    });
  } catch (error) {
    console.error('❌ Error triggering training:', error);
    res.status(500).json({
      success: false,
      message: `Error triggering training: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * Get ML training logs
 * GET /api/admin/ml/logs/training?modelId=1&limit=100&offset=0
 */
router.get('/logs/training', async (req, res) => {
  try {
    const modelId = req.query.modelId ? parseInt(req.query.modelId) : null;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
      SELECT 
        tl.id,
        tl.modelId,
        m.modelName,
        m.modelType,
        tl.epoch,
        tl.loss,
        tl.accuracy,
        tl.validationLoss,
        tl.validationAccuracy,
        tl.learningRate,
        tl.timestamp
      FROM ml_training_logs tl
      JOIN ml_models m ON tl.modelId = m.id
      WHERE 1=1
    `;
    const params = [];

    if (modelId) {
      query += ` AND tl.modelId = ?`;
      params.push(modelId);
    }

    query += ` ORDER BY tl.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await poolWrapper.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM ml_training_logs tl
      WHERE 1=1
    `;
    const countParams = [];

    if (modelId) {
      countQuery += ` AND tl.modelId = ?`;
      countParams.push(modelId);
    }

    const [countResult] = await poolWrapper.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        logs: rows,
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('❌ Error getting training logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting training logs'
    });
  }
});

/**
 * Get ML service logs (inference, errors, etc.)
 * GET /api/admin/ml/logs/service?logType=inference&limit=100&offset=0
 */
router.get('/logs/service', async (req, res) => {
  try {
    const logType = req.query.logType || 'all'; // inference, error, accuracy
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // For now, return empty as ML service logs are in-memory
    // In production, these should be stored in database
    res.json({
      success: true,
      data: {
        logs: [],
        total: 0,
        limit,
        offset,
        message: 'Service logs are stored in ML service memory. Connect to ML service API to retrieve.'
      }
    });
  } catch (error) {
    console.error('❌ Error getting service logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting service logs'
    });
  }
});

/**
 * Get ML error logs
 * GET /api/admin/ml/logs/errors?limit=100&offset=0
 */
router.get('/logs/errors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Get errors from anomalies table (high anomaly scores)
    const [rows] = await poolWrapper.execute(`
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
      WHERE a.anomalyScore >= 0.7
      ORDER BY a.createdAt DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count
    const [countResult] = await poolWrapper.execute(`
      SELECT COUNT(*) as total
      FROM ml_anomalies
      WHERE anomalyScore >= 0.7
    `);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        errors: rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
        })),
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('❌ Error getting error logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting error logs'
    });
  }
});

/**
 * Get ML inference logs (from predictions)
 * GET /api/admin/ml/logs/inference?limit=100&offset=0
 */
router.get('/logs/inference', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const [rows] = await poolWrapper.execute(`
      SELECT 
        id,
        userId,
        predictionType,
        probability,
        metadata,
        createdAt
      FROM ml_predictions
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count
    const [countResult] = await poolWrapper.execute(`
      SELECT COUNT(*) as total
      FROM ml_predictions
    `);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        inferences: rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata
        })),
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('❌ Error getting inference logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting inference logs'
    });
  }
});

module.exports = router;

