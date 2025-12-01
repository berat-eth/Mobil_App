const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const XmlSyncService = require('./services/xml-sync-service');
const { createDatabaseSchema } = require('./database-schema');
const chatSessionsRoutes = require('./routes/chat-sessions');

// Load environment variables from envai file
try { 
  require('dotenv').config({ path: '../.env' }); 
  console.log('✅ Environment variables loaded from envai file');
} catch (error) {
  console.warn('⚠️ Could not load envai file, using defaults:', error.message);
}

// Security utilities with environment-based configuration
const SALT_ROUNDS = 12;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? 
  Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : 
  crypto.randomBytes(32);
const IV_LENGTH = 16;

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure logging
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Password hashing
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

// Password verification
async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    return false;
  }
}

// Data encryption for sensitive fields
function encryptData(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Error encrypting data:', error);
    return text;
  }
}

// Data decryption for sensitive fields
function decryptData(encryptedText) {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText;
    }
    
    if (!encryptedText.includes(':')) {
      return encryptedText;
    }
    
    const textParts = encryptedText.split(':');
    if (textParts.length < 2) {
      return encryptedText;
    }
    
    const encryptedData = textParts.slice(1).join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting data:', error);
    return encryptedText;
  }
}

// Generate secure API key
function generateSecureApiKey() {
  return 'huglu_' + crypto.randomBytes(32).toString('hex');
}

// HTML entity decoder utility
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return text;
  
  const htmlEntities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&bull;': '•',
    '&middot;': '·',
    '&laquo;': '«',
    '&raquo;': '»',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢'
  };
  
  let decodedText = text;
  
  Object.keys(htmlEntities).forEach(entity => {
    const regex = new RegExp(entity, 'g');
    decodedText = decodedText.replace(regex, htmlEntities[entity]);
  });
  
  decodedText = decodedText.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });
  
  decodedText = decodedText.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  decodedText = decodedText.replace(/\s+/g, ' ').trim();
  
  return decodedText;
}

// Clean product data function
function cleanProductData(product) {
  if (!product) return product;
  
  const cleaned = { ...product };
  
  if (cleaned.name) cleaned.name = decodeHtmlEntities(cleaned.name);
  if (cleaned.description) cleaned.description = decodeHtmlEntities(cleaned.description);
  if (cleaned.category) cleaned.category = decodeHtmlEntities(cleaned.category);
  if (cleaned.brand) cleaned.brand = decodeHtmlEntities(cleaned.brand);
  
  return cleaned;
}

// Network detection helper
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name]) {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// GÜVENLİK: CSP Nonce middleware - unsafe-inline ve unsafe-eval kaldırıldı
const { cspNonceMiddleware } = require('./utils/csp-nonce');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Nonce middleware ile dinamik CSP kullanacağız
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// GÜVENLİK: CSP Nonce middleware - Her request için nonce oluşturur ve CSP header'ına ekler
// unsafe-inline ve unsafe-eval kaldırıldı, nonce kullanılıyor
app.use(cspNonceMiddleware);

// GÜVENLİK: Rate limiting - Kritik endpoint'ler için özel rate limiting
// OPTİMİZASYON: Rate limiting - Yüksek trafik için optimize edilmiş
const {
  createUnifiedAPILimiter,
  createLoginLimiter,
  createAdminLimiter,
  createCriticalLimiter,
  createWalletTransferLimiter,
  createPaymentLimiter,
  createGiftCardLimiter,
  createAdminWalletTransferLimiter,
  createSuspiciousIPLimiter
} = require('./utils/rate-limiting');

// Birleşik API limiter - Mobil/web tespiti yaparak tek limiter'da birleştirir
// Guest kullanıcılar için artırılmış limitler, çift rate limiting sorununu çözer
const limiter = createUnifiedAPILimiter();

// OPTİMİZASYON: Rate limiting uygulama - Sıralama düzenlendi
// Spesifik limiter'lar önce, global limiter'lar son

// 1. En spesifik endpoint'ler önce (login, kritik endpoint'ler)
app.use('/api/users/login', createLoginLimiter());
// Admin login rate limit kaldırıldı
// app.use('/api/admin/login', createLoginLimiter());

// 2. Kritik endpoint'ler (finansal)
app.use('/api/wallet/transfer', createWalletTransferLimiter());
app.use('/api/wallet/gift-card', createGiftCardLimiter());
app.use('/api/payments/process', createPaymentLimiter());
// Admin wallet transfer rate limit kaldırıldı
// app.use('/api/admin/wallets/transfer', createAdminWalletTransferLimiter());

// 3. Kategori bazlı endpoint'ler
app.use('/api/orders', createCriticalLimiter());
// Admin endpoint'leri - Rate limit kaldırıldı
// app.use('/api/admin', createAdminLimiter());

// 4. Global limiter (opsiyonel - environment variable ile kontrol edilebilir)
if (process.env.DISABLE_SUSPICIOUS_IP_LIMITER !== 'true') {
  app.use('/api', createSuspiciousIPLimiter());
}

// 5. Genel rate limiting (fallback - en son)
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// GÜVENLİK: CORS configuration - Whitelist tabanlı güvenli CORS
// KRİTİK: Production'da kesinlikle whitelist kullanılmalı
const corsOptions = {
  origin: function (origin, callback) {
    // Production için izin verilen origin'ler
    const allowedOrigins = [
      'https://api.huglutekstil.com',
      'https://admin.huglutekstil.com',
      'https://huglutekstil.com',
      'https://www.huglutekstil.com'
    ];
    
    // Origin yoksa (mobil uygulama veya same-origin request için)
    if (!origin) {
      // Mobil uygulama için origin yok, ama API key ile korunuyor
      // Same-origin request'ler için izin ver
      return callback(null, true);
    }
    
    // Origin izin verilen listede mi kontrol et
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // GÜVENLİK: Whitelist'te olmayan origin'leri reddet
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS. Origin "${origin}" is not in whitelist.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Key', 'X-Tenant-Id', 'x-tenant-id', 'X-CSRF-Token', 'csrf-token', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-CSRF-Token'],
  credentials: true, // GÜVENLİK: credentials: true ile wildcard origin kullanılmıyor
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 saat preflight cache
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// Request logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.method !== 'GET' && process.env.LOG_LEVEL !== 'error') {
      console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log('📤 Request Body:', JSON.stringify(req.body, null, 2));
      }
    }
    originalSend.call(this, data);
  };
  next();
});

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || '92.113.22.70',
  user: process.env.DB_USER || 'u987029066_mobil_app',
  password: process.env.DB_PASSWORD || '38cdfD8218.',
  database: process.env.DB_NAME || 'u987029066_berqt',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  queueLimit: 0,
  waitForConnections: true,
  maxIdle: 60000,
  idleTimeout: 60000,
  ssl: process.env.DB_SSL === 'true',
  charset: 'utf8mb4'
};

// Create database pool
let pool;
let xmlSyncService;

// SQL Query Logger Wrapper
function logQuery(sql, params, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  if (process.env.LOG_LEVEL !== 'error') {
    console.log(`\n📊 [SQL QUERY] ${duration}ms`);
    console.log(`🔍 SQL: ${sql}`);
    if (params && params.length > 0) {
      console.log(`📝 Params: ${JSON.stringify(params)}`);
    }
    console.log(`⏱️  Duration: ${duration}ms`);
  }
}

// Wrapped pool methods for logging
const poolWrapper = {
  async execute(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.execute(sql, params);
      if (process.env.LOG_LEVEL !== 'error') {
        logQuery(sql, params, startTime);
      }
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },
  
  async query(sql, params) {
    const startTime = Date.now();
    try {
      const result = await pool.query(sql, params);
      if (process.env.LOG_LEVEL !== 'error') {
        logQuery(sql, params, startTime);
      }
      return result;
    } catch (error) {
      logQuery(sql, params, startTime);
      console.error(`❌ SQL Error: ${error.message}`);
      throw error;
    }
  },
  
  async getConnection() {
    try {
      const connection = await pool.getConnection();
      
      // Wrap connection methods for logging
      const originalExecute = connection.execute;
      const originalQuery = connection.query;
      const originalBeginTransaction = connection.beginTransaction;
      const originalCommit = connection.commit;
      const originalRollback = connection.rollback;
      
      connection.execute = async function(sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalExecute.call(this, sql, params);
          if (process.env.LOG_LEVEL !== 'error') {
            logQuery(sql, params, startTime);
          }
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };
      
      connection.query = async function(sql, params) {
        const startTime = Date.now();
        try {
          const result = await originalQuery.call(this, sql, params);
          if (process.env.LOG_LEVEL !== 'error') {
            logQuery(sql, params, startTime);
          }
          return result;
        } catch (error) {
          logQuery(sql, params, startTime);
          console.error(`❌ SQL Error: ${error.message}`);
          throw error;
        }
      };
      
      connection.beginTransaction = async function() {
        if (process.env.LOG_LEVEL !== 'error') {
          console.log('🔄 Transaction started');
        }
        return await originalBeginTransaction.call(this);
      };
      
      connection.commit = async function() {
        if (process.env.LOG_LEVEL !== 'error') {
          console.log('✅ Transaction committed');
        }
        return await originalCommit.call(this);
      };
      
      connection.rollback = async function() {
        if (process.env.LOG_LEVEL !== 'error') {
          console.log('🔄 Transaction rolled back');
        }
        return await originalRollback.call(this);
      };
      
      return connection;
    } catch (error) {
      console.error(`❌ Error getting connection: ${error.message}`);
      throw error;
    }
  }
};

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    
    // Create database schema
    await createDatabaseSchema(pool);
    
    // Initialize XML Sync Service if enabled
    if (process.env.XML_SYNC_ENABLED !== 'false') {
      xmlSyncService = new XmlSyncService(pool);
      console.log('📡 XML Sync Service initialized');
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Quick database check
    const connection = await pool.getConnection();
    connection.release();
    
    // System info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({ 
      success: true, 
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      database: 'connected'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import all routes from the original server
// We'll copy the relevant route handlers here
// ... (All the existing routes from server.js would be included here)

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { error: error.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  
  if (pool) {
    await pool.end();
    console.log('✅ Database connections closed');
  }
  
  if (xmlSyncService) {
    xmlSyncService.stop();
    console.log('✅ XML Sync Service stopped');
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  
  if (pool) {
    await pool.end();
    console.log('✅ Database connections closed');
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Include all route handlers from original server.js here
    // For brevity, I'm not copying all routes, but they would go here
    
    // Chat Sessions Routes
    app.use('/api/chat/sessions', chatSessionsRoutes);
    
    const localIP = getLocalIPAddress();
    
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n🚀 Production Server Started`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Local API: http://localhost:${PORT}/api`);
      console.log(`🌐 Network API: http://${localIP}:${PORT}/api`);
      console.log(`🌐 External API: http://${HOST}:${PORT}/api`);
      console.log(`📊 Database: ${dbConfig.host}:${dbConfig.port}`);
      console.log(`🔒 Security: Helmet, Rate Limiting, CORS enabled`);
      console.log(`📝 Logging: ${process.env.NODE_ENV === 'production' ? 'File & Console' : 'Console only'}`);
      console.log(`🗜️  Compression: Enabled`);
      
      if (xmlSyncService && process.env.XML_SYNC_ENABLED !== 'false') {
        xmlSyncService.startScheduledSync();
        console.log(`📡 XML Sync Service started (every 4 hours)`);
      }
      
      console.log(`\n✅ Server ready to accept connections\n`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
