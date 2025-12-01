const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const InputValidation = require('../security/input-validation');

// Lazy load poolWrapper to avoid initialization order issues
function getPoolWrapper() {
  if (global.poolWrapper) {
    return global.poolWrapper;
  }
  const { poolWrapper } = require('../database-schema');
  return poolWrapper;
}

// poolWrapper'ı lazy olarak al (her kullanımda kontrol et)
function getPool() {
  return getPoolWrapper();
}

const inputValidator = new InputValidation();

// Güvenli tablo isimleri whitelist
const ALLOWED_TABLES = [
  'users', 'products', 'categories', 'orders', 'cart_items',
  'campaigns', 'discount_codes', 'stories', 'sliders', 'flash_deals',
  'live_users', 'user_activities', 'admin_logs', 'tenants',
  'product_variations', 'product_variation_options', 'cart',
  'user_wallets', 'wallet_transactions', 'reviews', 'custom_production_requests'
];

// Tablo ismi doğrulama fonksiyonu
function validateTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    return false;
  }
  
  // Sadece alfanumerik ve underscore karakterlerine izin ver
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return false;
  }
  
  // Whitelist kontrolü
  return ALLOWED_TABLES.includes(tableName);
}

// Güvenli tablo ismi sanitizasyonu
function sanitizeTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') {
    return null;
  }
  
  // Sadece alfanumerik ve underscore karakterlerini koru
  const sanitized = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Whitelist kontrolü
  if (!ALLOWED_TABLES.includes(sanitized)) {
    return null;
  }
  
  return sanitized;
}

// JSON yedek endpoint'i - Admin authentication gerekli
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    console.log('📦 JSON backup requested by admin');
    
    const backupData = {};
    
    for (const table of ALLOWED_TABLES) {
      try {
        // Tablo ismi whitelist'te olduğu için güvenli - backtick ile sarmalayarak kullan
        const [rows] = await getPool().execute(`SELECT * FROM \`${table}\``);
        backupData[table] = rows;
        console.log(`✅ Table ${table}: ${rows.length} records`);
      } catch (error) {
        console.warn(`⚠️ Table ${table} not found or error:`, error.message);
        backupData[table] = [];
      }
    }
    
    // Metadata ekle
    backupData._metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      format: 'json',
      tables: Object.keys(backupData).filter(key => key !== '_metadata'),
      totalRecords: Object.values(backupData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    };
    
    res.json(backupData);
  } catch (error) {
    console.error('❌ JSON backup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Backup oluşturulamadı',
      error: error.message 
    });
  }
});

// SQL yedek endpoint'i - Admin authentication gerekli
router.get('/sql', authenticateAdmin, async (req, res) => {
  try {
    console.log('🗄️ SQL backup requested by admin');
    
    let sqlBackup = '';
    const timestamp = new Date().toISOString();
    
    // SQL başlığı
    sqlBackup += `-- SQL Backup\n`;
    sqlBackup += `-- Generated: ${timestamp}\n`;
    sqlBackup += `-- Database: ${process.env.DB_NAME || 'huglu_outdoor'}\n`;
    sqlBackup += `-- Version: 1.0\n\n`;
    
    // SET komutları
    sqlBackup += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sqlBackup += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
    sqlBackup += `SET AUTOCOMMIT = 0;\n`;
    sqlBackup += `START TRANSACTION;\n`;
    sqlBackup += `SET time_zone = "+00:00";\n\n`;
    
    // Sadece whitelist'teki tabloları al - Güvenli parametreli sorgu
    const placeholders = ALLOWED_TABLES.map(() => '?').join(',');
    const [tables] = await getPool().execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME
    `, ALLOWED_TABLES);
    
    console.log(`📋 Found ${tables.length} allowed tables`);
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // Güvenlik kontrolü - double check
      if (!validateTableName(tableName)) {
        console.warn(`⚠️ Skipping invalid table name: ${tableName}`);
        continue;
      }
      
      try {
        // Tablo ismi validate edildi - backtick ile sarmalayarak kullan
        const [createTable] = await getPool().execute(`SHOW CREATE TABLE \`${tableName}\``);
        if (createTable && createTable[0]) {
          sqlBackup += `-- Table structure for table \`${tableName}\`\n`;
          sqlBackup += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
          sqlBackup += `${createTable[0]['Create Table']};\n\n`;
        }
        
        // Tablo verilerini al - tablo ismi validate edildi
        const [rows] = await getPool().execute(`SELECT * FROM \`${tableName}\``);
        
        if (rows.length > 0) {
          sqlBackup += `-- Data for table \`${tableName}\`\n`;
          
          // INSERT komutlarını oluştur
          const columns = Object.keys(rows[0]);
          const columnNames = columns.map(col => `\`${col}\``).join(', ');
          
          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (typeof value === 'boolean') return value ? '1' : '0';
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            }).join(', ');
            
            sqlBackup += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values});\n`;
          }
          
          sqlBackup += `\n`;
          console.log(`✅ Table ${tableName}: ${rows.length} records exported`);
        } else {
          sqlBackup += `-- No data for table \`${tableName}\`\n\n`;
          console.log(`📭 Table ${tableName}: No data`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error processing table ${tableName}:`, error.message);
        sqlBackup += `-- Error processing table \`${tableName}\`: ${error.message}\n\n`;
      }
    }
    
    // Son komutlar
    sqlBackup += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sqlBackup += `COMMIT;\n`;
    sqlBackup += `-- Backup completed at ${new Date().toISOString()}\n`;
    
    console.log(`✅ SQL backup completed: ${sqlBackup.length} characters`);
    
    res.json({
      success: true,
      sql: sqlBackup,
      metadata: {
        timestamp,
        format: 'sql',
        size: sqlBackup.length,
        tables: tables.length,
        totalRecords: sqlBackup.split('INSERT INTO').length - 1
      }
    });
    
  } catch (error) {
    console.error('❌ SQL backup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'SQL backup oluşturulamadı',
      error: error.message 
    });
  }
});

// Restore endpoint'i - Admin authentication gerekli
router.post('/restore', authenticateAdmin, async (req, res) => {
  try {
    const { data, format } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Restore verisi bulunamadı' 
      });
    }
    
    // SQL injection kontrolü
    if (inputValidator.scanObjectForSqlInjection({ data, format })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected in restore data'
      });
    }
    
    console.log(`🔄 Restore requested by admin: ${format || 'unknown'} format`);
    
    if (format === 'sql') {
      // SQL restore - Güvenlik: Sadece SELECT, INSERT, UPDATE, DELETE komutlarına izin ver
      const sqlCommands = data.split(';').filter(cmd => cmd.trim());
      const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
      
      for (const sql of sqlCommands) {
        const sqlUpper = sql.trim().toUpperCase();
        const hasDangerousKeyword = dangerousKeywords.some(keyword => sqlUpper.includes(keyword));
        
        if (hasDangerousKeyword) {
          console.warn(`⚠️ Skipping dangerous SQL command: ${sql.substring(0, 100)}`);
          continue;
        }
        
        if (sql.trim()) {
          await getPool().execute(sql.trim());
        }
      }
      
      console.log(`✅ SQL restore completed: ${sqlCommands.length} commands`);
      
    } else {
      // JSON restore - Tablo ismi doğrulama ile
      for (const [tableName, records] of Object.entries(data)) {
        if (tableName.startsWith('_')) continue;
        
        // Tablo ismi doğrulama
        const sanitizedTableName = sanitizeTableName(tableName);
        if (!sanitizedTableName) {
          console.warn(`⚠️ Skipping invalid table name: ${tableName}`);
          continue;
        }
        
        if (Array.isArray(records) && records.length > 0) {
          // Tabloyu temizle - tablo ismi validate edildi
          await getPool().execute(`DELETE FROM \`${sanitizedTableName}\``);
          
          // Verileri ekle
          for (const record of records) {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = columns.map(() => '?').join(', ');
            
            // Column isimlerini sanitize et
            const sanitizedColumns = columns.map(col => col.replace(/[^a-zA-Z0-9_]/g, '')).filter(col => col);
            
            if (sanitizedColumns.length !== columns.length) {
              console.warn(`⚠️ Skipping record with invalid column names`);
              continue;
            }
            
            // Column isimlerini backtick ile sarmala
            const columnNames = sanitizedColumns.map(col => `\`${col}\``).join(', ');
            
            await getPool().execute(
              `INSERT INTO \`${sanitizedTableName}\` (${columnNames}) VALUES (${placeholders})`,
              values
            );
          }
          
          console.log(`✅ Table ${sanitizedTableName}: ${records.length} records restored`);
        }
      }
      
      console.log(`✅ JSON restore completed`);
    }
    
    res.json({
      success: true,
      message: 'Restore başarıyla tamamlandı'
    });
    
  } catch (error) {
    console.error('❌ Restore error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Restore başarısız',
      error: error.message 
    });
  }
});

module.exports = router;
