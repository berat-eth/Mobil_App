const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Veritabanı Güvenlik Modülü
 * Maksimum güvenlik için kapsamlı koruma sağlar
 */

class DatabaseSecurity {
  constructor() {
    this.auditLog = [];
    this.failedAttempts = new Map();
    this.blockedIPs = new Set();
    this.maxFailedAttempts = 5;
    this.blockDuration = 15 * 60 * 1000; // 15 dakika
  }

  /**
   * Güvenli veritabanı konfigürasyonu
   */
  getSecureDbConfig() {
    const useSSL = String(process.env.SSL_ENABLED || 'false').toLowerCase() === 'true';
    let sslOptions;
    if (useSSL) {
      try {
        const fs = require('fs');
        const ca = process.env.SSL_CA_PATH && fs.existsSync(process.env.SSL_CA_PATH)
          ? fs.readFileSync(process.env.SSL_CA_PATH)
          : undefined;
        const cert = process.env.SSL_CERT_PATH && fs.existsSync(process.env.SSL_CERT_PATH)
          ? fs.readFileSync(process.env.SSL_CERT_PATH)
          : undefined;
        const key = process.env.SSL_KEY_PATH && fs.existsSync(process.env.SSL_KEY_PATH)
          ? fs.readFileSync(process.env.SSL_KEY_PATH)
          : undefined;
        sslOptions = { rejectUnauthorized: true, ca, cert, key };
      } catch (e) {
        console.warn('⚠️ SSL dosyaları okunamadı, SSL kapatılıyor:', e.message);
        sslOptions = undefined;
      }
    }

    return {
      host: process.env.DB_HOST || '92.113.22.70',
      user: process.env.DB_USER || 'u987029066_berqt',
      password: process.env.DB_PASSWORD || '38cdfD8218.',
      database: process.env.DB_NAME || 'u987029066_mobil_app',
      port: parseInt(process.env.DB_PORT) || 3306,
      connectionLimit: 30,       // ✅ MySQL max_user_connections=50 limiti için güvenli değer (30)
      queueLimit: 0,             // ✅ Queue limit'i kaldır (0 = unlimited, sadece connection limit kontrol edilir)
      waitForConnections: true,
      acquireTimeout: 10000,      // ✅ 5 saniye → 10 saniye (queue'da beklerken daha fazla zaman)
      timeout: 30000,             // ✅ 20 saniye → 30 saniye (daha uzun timeout)
      enableKeepAlive: true,       // ✅ Connection keep-alive aktif
      keepAliveInitialDelay: 0,   // ✅ Keep-alive hemen başlasın
      maxIdle: 10,                // ✅ Maksimum idle connection sayısı (10)
      idleTimeout: 600000,        // ✅ Idle connection timeout (10 dakika)
      ssl: sslOptions,
      charset: 'utf8mb4',
      multipleStatements: false,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true
    };
  }

  /**
   * SQL Injection koruması
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    // Tehlikeli karakter ve yorum paterni temizleme (anahtar kelime silme yok)
    return input
      .replace(/['"`;]/g, '') // tırnaklar ve noktalı virgül
      .replace(/--.*$/gm, '') // satır içi yorum
      .replace(/\/\*[\s\S]*?\*\//g, '') // blok yorum
      .trim();
  }

  /**
   * Parametreli sorgu doğrulaması - Güçlendirilmiş SQL Injection koruması
   */
  validateQuery(sql, params = []) {
    if (typeof sql !== 'string') {
      throw new Error('SQL query must be a string');
    }

    const upper = sql.toUpperCase().trim();

    // 1. Tehlikeli SQL komutlarını kontrol et
    const dangerousPatterns = [
      /DROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION)/i,
      /DELETE\s+FROM/i,
      /UPDATE\s+.*\s+SET/i,
      /INSERT\s+INTO/i,
      /ALTER\s+(TABLE|DATABASE|SCHEMA)/i,
      /CREATE\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION)/i,
      /TRUNCATE\s+TABLE/i,
      /EXEC\s*\(|EXECUTE\s*\(|CALL\s+/i,
      /UNION\s+(ALL\s+)?SELECT/i,
      /OR\s+1\s*=\s*1|AND\s+1\s*=\s*1/i,
      /OR\s+['"]1['"]\s*=\s*['"]1['"]|AND\s+['"]1['"]\s*=\s*['"]1['"]/i,
      /LOAD_FILE\s*\(/i,
      /INTO\s+(OUTFILE|DUMPFILE)/i,
      /BENCHMARK\s*\(/i,
      /SLEEP\s*\(|WAITFOR\s+DELAY|PG_SLEEP\s*\(/i,
      /INFORMATION_SCHEMA/i,
      /mysql\./i,
      /sys\./i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new Error(`Potentially dangerous SQL pattern detected: ${pattern}`);
      }
    }

    // 2. SQL comment injection engelleme
    if (sql.includes('--') || sql.includes('/*') || sql.includes('*/') || sql.includes('#')) {
      throw new Error('SQL comments are not allowed');
    }

    // 3. Multiple statement engelleme
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    if (statements.length > 1) {
      throw new Error('Multiple statements are not allowed');
    }

    // 4. Hex encoding engelleme (0x414243 gibi)
    if (/0x[0-9A-Fa-f]{4,}/i.test(sql)) {
      throw new Error('Hex encoding in SQL is not allowed');
    }

    // 5. Char() fonksiyonu engelleme (SQL injection için kullanılabilir)
    if (/CHAR\s*\(/i.test(sql) && !/CHAR\(/i.test(sql.replace(/\s+/g, ''))) {
      // CHAR fonksiyonu kullanımı şüpheli olabilir
      console.warn('⚠️ CHAR() function detected in query - potential SQL injection attempt');
    }

    // 6. Parametre sayısını kontrol et
    const paramCount = (sql.match(/\?/g) || []).length;
    if (params && Array.isArray(params)) {
      if (paramCount !== params.length) {
        throw new Error(`Parameter count mismatch. Expected ${paramCount}, got ${params.length}`);
      }
      
      // 7. Parametre tiplerini kontrol et (sadece primitive types)
      for (const param of params) {
        if (param !== null && param !== undefined && typeof param === 'object' && !(param instanceof Date)) {
          throw new Error('Complex objects are not allowed as SQL parameters');
        }
      }
    } else if (paramCount > 0) {
      throw new Error(`Query requires ${paramCount} parameters but none provided`);
    }

    // 8. Query uzunluk kontrolü (DoS koruması)
    if (sql.length > 5000) {
      throw new Error('Query too long. Maximum 5000 characters allowed');
    }

    // 9. Nested query kontrolü (parantez sayısı)
    const openParenCount = (sql.match(/\(/g) || []).length;
    const closeParenCount = (sql.match(/\)/g) || []).length;
    if (openParenCount !== closeParenCount) {
      throw new Error('Unbalanced parentheses in SQL query');
    }
    if (openParenCount > 10) {
      throw new Error('Too many nested structures in SQL query');
    }

    // 10. String literal injection kontrolü (tırnak sayısı)
    const singleQuoteCount = (sql.match(/'/g) || []).length;
    const doubleQuoteCount = (sql.match(/"/g) || []).length;
    if (singleQuoteCount % 2 !== 0 || doubleQuoteCount % 2 !== 0) {
      throw new Error('Unbalanced quotes in SQL query - potential injection attempt');
    }

    return true;
  }

  /**
   * Veri maskeleme (sensitive data için)
   */
  maskSensitiveData(data, fields = ['password', 'email', 'phone', 'ssn', 'creditCard']) {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    
    fields.forEach(field => {
      if (masked[field]) {
        if (field === 'email') {
          const [username, domain] = masked[field].split('@');
          masked[field] = `${username.substring(0, 2)}***@${domain}`;
        } else if (field === 'phone') {
          masked[field] = masked[field].replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
        } else if (field === 'creditCard') {
          masked[field] = masked[field].replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
        } else {
          masked[field] = '***';
        }
      }
    });

    return masked;
  }

  /**
   * Audit log sistemi
   */
  logDatabaseAccess(userId, action, table, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      action,
      table,
      details: this.maskSensitiveData(details),
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };

    this.auditLog.push(logEntry);
    
    // Log dosyasına yaz (production'da)
    if (process.env.NODE_ENV === 'production') {
      console.log(`🔍 DB_AUDIT: ${JSON.stringify(logEntry)}`);
    }

    // Log boyutunu sınırla
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Brute force koruması
   */
  checkBruteForceProtection(ip, userId) {
    const key = `${ip}_${userId}`;
    const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
    
    const now = Date.now();
    const timeDiff = now - attempts.lastAttempt;
    
    // 15 dakika geçtiyse sıfırla
    if (timeDiff > this.blockDuration) {
      attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    this.failedAttempts.set(key, attempts);
    
    if (attempts.count >= this.maxFailedAttempts) {
      this.blockedIPs.add(ip);
      this.logDatabaseAccess(userId, 'BRUTE_FORCE_BLOCKED', 'security', { ip, attempts: attempts.count });
      throw new Error('Too many failed attempts. IP blocked temporarily.');
    }
    
    return true;
  }

  /**
   * IP engelleme kontrolü
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * IP'yi manuel olarak engelle
   */
  blockIP(ip, reason = 'Manual block') {
    if (!ip || typeof ip !== 'string') {
      throw new Error('Invalid IP address');
    }
    this.blockedIPs.add(ip);
    this.logDatabaseAccess('admin', 'IP_BLOCKED', ip, { reason, timestamp: new Date().toISOString() });
    return true;
  }

  /**
   * IP engelini kaldır
   */
  unblockIP(ip) {
    if (!ip || typeof ip !== 'string') {
      throw new Error('Invalid IP address');
    }
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    if (wasBlocked) {
      this.logDatabaseAccess('admin', 'IP_UNBLOCKED', ip, { timestamp: new Date().toISOString() });
    }
    return wasBlocked;
  }

  /**
   * Engellenmiş IP'leri listele
   */
  getBlockedIPs() {
    return Array.from(this.blockedIPs);
  }

  /**
   * Başarılı giriş sonrası sıfırlama
   */
  resetFailedAttempts(ip, userId) {
    const key = `${ip}_${userId}`;
    this.failedAttempts.delete(key);
    this.blockedIPs.delete(ip);
  }

  /**
   * Veri bütünlüğü kontrolü
   */
  validateDataIntegrity(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
        }
        
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be no more than ${rules.maxLength} characters`);
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Data validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Güvenli hash oluşturma
   */
  createSecureHash(data) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Hash doğrulama
   */
  verifySecureHash(data, hash) {
    const [salt, hashValue] = hash.split(':');
    const testHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return testHash === hashValue;
  }

  /**
   * Güvenli rastgele token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Veritabanı bağlantı güvenliği
   */
  secureConnection(connection) {
    // Bağlantı timeout'u
    connection.timeout = 30000;
    
    // Query timeout'u
    connection.queryTimeout = 30000;
    
    // Bağlantı kapatma
    const originalEnd = connection.end;
    connection.end = function() {
      console.log('🔒 Database connection securely closed');
      return originalEnd.call(this);
    };
    
    return connection;
  }

  /**
   * Backup güvenliği
   */
  createSecureBackup(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      data: this.maskSensitiveData(data),
      checksum: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };
    
    return backupData;
  }

  /**
   * Güvenlik raporu
   */
  getSecurityReport() {
    return {
      totalAuditLogs: this.auditLog.length,
      blockedIPs: this.blockedIPs.size,
      failedAttempts: this.failedAttempts.size,
      last24Hours: this.auditLog.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return logTime > dayAgo;
      }).length
    };
  }

  /**
   * SQL Injection Koruması - Table Name Whitelist
   * Sadece whitelist'teki table name'lere izin verir
   */
  static getAllowedTables() {
    return [
      'tenants', 'users', 'user_addresses', 'products', 'product_variations', 
      'product_variation_options', 'cart', 'orders', 'order_items', 'reviews',
      'user_wallets', 'wallet_transactions', 'return_requests', 'payment_transactions',
      'custom_production_messages', 'custom_production_requests', 'custom_production_items',
      'customer_segments', 'campaigns', 'customer_segment_assignments', 'campaign_usage',
      'customer_analytics', 'discount_wheel_spins', 'chatbot_analytics',
      'wallet_recharge_requests', 'user_discount_codes', 'referral_earnings', 'user_events',
      'user_profiles', 'categories', 'recommendations', 'gift_cards', 'security_events',
      'segments', 'user_segments', 'segment_stats',
      'warehouses', 'warehouse_locations', 'bins', 'inventory_items', 'inventory_movements',
      'suppliers', 'purchase_orders', 'purchase_order_items',
      'bill_of_materials', 'bom_items', 'workstations', 'production_orders',
      'production_order_items', 'production_steps', 'material_issues', 'finished_goods_receipts',
      'crm_leads', 'crm_contacts', 'crm_pipeline_stages', 'crm_deals', 'crm_activities',
      'stories', 'sliders', 'popups',
      'anonymous_devices', 'user_behavior_events', 'user_sessions', 'device_analytics_aggregates',
      'ml_predictions', 'ml_recommendations', 'ml_anomalies', 'gmaps_jobs', 'gmaps_leads',
      'chat_sessions', 'chat_messages'
    ];
  }

  /**
   * Güvenli table name identifier (backtick ile)
   * Güçlendirilmiş whitelist kontrolü ve validasyon
   */
  static safeTableIdentifier(tableName) {
    if (typeof tableName !== 'string') {
      throw new Error('Table name must be a string');
    }
    
    // 1. Boş string kontrolü
    const trimmed = tableName.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error('Table name cannot be empty');
    }
    
    // 2. Maksimum uzunluk kontrolü
    if (trimmed.length > 64) {
      throw new Error('Table name too long (max 64 characters)');
    }
    
    // 3. Alphanumeric ve underscore kontrolü (ekstra güvenlik)
    // Sadece harf, rakam ve underscore'e izin ver
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(trimmed)) {
      throw new Error(`Invalid table name format: "${trimmed}" - Only alphanumeric and underscore allowed, must start with letter`);
    }
    
    // 4. SQL keyword kontrolü (table name olarak kullanılamaz)
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
      'TABLE', 'DATABASE', 'SCHEMA', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE',
      'FUNCTION', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'UNION',
      'WHERE', 'FROM', 'INTO', 'SET', 'VALUES', 'AND', 'OR', 'NOT', 'NULL',
      'TRUE', 'FALSE', 'IF', 'ELSE', 'CASE', 'WHEN', 'THEN', 'END', 'AS',
      'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS', 'NATURAL',
      'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'LIKE', 'IN', 'EXISTS', 'BETWEEN'
    ];
    if (sqlKeywords.includes(trimmed.toUpperCase())) {
      throw new Error(`Table name cannot be a SQL keyword: "${trimmed}"`);
    }
    
    // 5. Tehlikeli pattern kontrolü
    const dangerousPatterns = [
      /\.\./,           // Path traversal
      /[<>:"|?*]/,      // Windows yasak karakterleri
      /[\x00-\x1F]/,    // Control karakterleri
      /[;'"]/,          // SQL injection karakterleri
      /\/|\\.*/,        // Path separator'ları
      /^[0-9]/,         // Rakamla başlayamaz
      /__+/,            // Çoklu underscore (şüpheli)
      /^_|_$/,          // Başta veya sonda underscore (şüpheli)
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        throw new Error(`Table name contains dangerous pattern: "${trimmed}"`);
      }
    }
    
    // 6. Whitelist kontrolü (en önemli güvenlik katmanı)
    const allowedTables = this.getAllowedTables();
    if (!allowedTables.includes(trimmed)) {
      throw new Error(`Table name "${trimmed}" is not in whitelist. Allowed tables: ${allowedTables.slice(0, 5).join(', ')}...`);
    }
    
    // 7. Case-insensitive kontrol (ekstra güvenlik)
    const lowerTrimmed = trimmed.toLowerCase();
    const lowerAllowed = allowedTables.map(t => t.toLowerCase());
    if (!lowerAllowed.includes(lowerTrimmed)) {
      throw new Error(`Table name "${trimmed}" (case-insensitive) is not in whitelist`);
    }
    
    // 8. Backtick ile güvenli identifier döndür
    // MySQL'de backtick ile identifier'lar escape edilir
    return '`' + trimmed + '`';
  }

  /**
   * Güvenli column name identifier
   */
  static safeColumnIdentifier(columnName) {
    if (typeof columnName !== 'string') {
      throw new Error('Column name must be a string');
    }
    
    // Alphanumeric ve underscore kontrolü
    if (!/^[A-Za-z0-9_]+$/.test(columnName)) {
      throw new Error('Invalid column name format');
    }
    
    return '`' + columnName + '`';
  }

  /**
   * Güvenli WHERE clause builder
   * String concatenation yerine parametreli sorgu kullanır
   */
  static buildWhereClause(conditions) {
    const clauses = [];
    const params = [];
    
    for (const [field, operator, value] of conditions) {
      const safeField = this.safeColumnIdentifier(field);
      
      if (operator === 'LIKE') {
        clauses.push(`${safeField} LIKE ?`);
        params.push(`%${value}%`);
      } else if (operator === '=') {
        clauses.push(`${safeField} = ?`);
        params.push(value);
      } else if (operator === '>=') {
        clauses.push(`${safeField} >= ?`);
        params.push(value);
      } else if (operator === '<=') {
        clauses.push(`${safeField} <= ?`);
        params.push(value);
      } else if (operator === '>') {
        clauses.push(`${safeField} > ?`);
        params.push(value);
      } else if (operator === '<') {
        clauses.push(`${safeField} < ?`);
        params.push(value);
      } else if (operator === 'IN') {
        if (!Array.isArray(value)) {
          throw new Error('IN operator requires an array');
        }
        const placeholders = value.map(() => '?').join(',');
        clauses.push(`${safeField} IN (${placeholders})`);
        params.push(...value);
      } else if (operator === 'DATE_FILTER') {
        // Date filter için özel işleme
        if (typeof value === 'string' && value.startsWith('>=')) {
          const dateValue = value.substring(2).trim().replace(/^['"]|['"]$/g, '');
          clauses.push(`${safeField} >= ?`);
          params.push(dateValue);
        } else {
          clauses.push(`${safeField} >= ?`);
          params.push(value);
        }
      } else {
        throw new Error(`Unsupported operator: ${operator}`);
      }
    }
    
    return {
      clause: clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '',
      params
    };
  }
}

module.exports = DatabaseSecurity;
