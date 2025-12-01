const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '92.113.22.70',
  user: process.env.DB_USER || 'u987029066_Admin',
  password: process.env.DB_PASSWORD || '38cdfD8217..',
  database: process.env.DB_NAME || 'u987029066_mobil',
  port: parseInt(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4'
};

async function createChatTables() {
  let connection;
  
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Veritabanı bağlantısı başarılı');

    // Chat Sessions tablosu oluştur
    console.log('📝 Chat Sessions tablosu oluşturuluyor...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        messageCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created_at (createdAt),
        INDEX idx_updated_at (updatedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Chat Sessions tablosu oluşturuldu');

    // Chat Messages tablosu oluştur
    console.log('📝 Chat Messages tablosu oluşturuluyor...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        sessionId VARCHAR(36) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_id (sessionId),
        INDEX idx_timestamp (timestamp),
        INDEX idx_role (role),
        FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Chat Messages tablosu oluşturuldu');

    // Tabloları kontrol et
    console.log('🔍 Tablolar kontrol ediliyor...');
    const [sessionsTable] = await connection.execute('SHOW TABLES LIKE "chat_sessions"');
    const [messagesTable] = await connection.execute('SHOW TABLES LIKE "chat_messages"');
    
    if (sessionsTable.length > 0) {
      console.log('✅ chat_sessions tablosu mevcut');
    } else {
      console.log('❌ chat_sessions tablosu bulunamadı');
    }
    
    if (messagesTable.length > 0) {
      console.log('✅ chat_messages tablosu mevcut');
    } else {
      console.log('❌ chat_messages tablosu bulunamadı');
    }

    // Test verisi ekle
    console.log('🧪 Test verisi ekleniyor...');
    const testSessionId = 'test-session-' + Date.now();
    
    await connection.execute(`
      INSERT INTO chat_sessions (id, name, messageCount) 
      VALUES (?, ?, ?)
    `, [testSessionId, 'Test Session', 0]);
    
    await connection.execute(`
      INSERT INTO chat_messages (id, sessionId, role, content) 
      VALUES (?, ?, ?, ?)
    `, ['test-msg-1', testSessionId, 'user', 'Merhaba!']);
    
    await connection.execute(`
      INSERT INTO chat_messages (id, sessionId, role, content) 
      VALUES (?, ?, ?, ?)
    `, ['test-msg-2', testSessionId, 'assistant', 'Merhaba! Size nasıl yardımcı olabilirim?']);
    
    // Message count'u güncelle
    await connection.execute(`
      UPDATE chat_sessions 
      SET messageCount = 2 
      WHERE id = ?
    `, [testSessionId]);
    
    console.log('✅ Test verisi eklendi');

    // Test verisini kontrol et
    const [testData] = await connection.execute(`
      SELECT s.name, s.messageCount, COUNT(m.id) as actualCount
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.sessionId
      WHERE s.id = ?
      GROUP BY s.id
    `, [testSessionId]);
    
    if (testData.length > 0) {
      console.log('✅ Test verisi doğrulandı:', testData[0]);
    }

    console.log('\n🎉 Chat tabloları başarıyla oluşturuldu!');
    console.log('📊 Tablolar:');
    console.log('   - chat_sessions: Session bilgileri');
    console.log('   - chat_messages: Mesaj bilgileri');
    console.log('🔗 Foreign Key: chat_messages.sessionId -> chat_sessions.id');
    console.log('🗑️  CASCADE DELETE: Session silindiğinde mesajlar da silinir');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Veritabanı bağlantısı kapatıldı');
    }
  }
}

// Script'i çalıştır
if (require.main === module) {
  createChatTables()
    .then(() => {
      console.log('✅ Migration tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration başarısız:', error);
      process.exit(1);
    });
}

module.exports = { createChatTables };
