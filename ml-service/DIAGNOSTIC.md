# ML Servis Sorun Giderme Rehberi

## Sorun: ML Servisi Veritabanına Veri Yazmıyor

### Olası Nedenler ve Çözümler

#### 1. Modeller Eğitilmemiş
**Belirti:** Veritabanında `ml_predictions`, `ml_anomalies`, `ml_recommendations`, `ml_segments` tablolarında veri yok.

**Çözüm:**
```bash
# ML servisini başlat
cd ml-service
python main.py

# Modelleri eğit
curl -X POST http://localhost:8001/api/train/purchase
curl -X POST http://localhost:8001/api/train/recommendation
curl -X POST http://localhost:8001/api/train/anomaly
curl -X POST http://localhost:8001/api/train/segmentation
```

#### 2. Redis Bağlantısı Yok
**Belirti:** Loglarda "Redis connection failed" hatası.

**Kontrol:**
```bash
# Redis durumunu kontrol et
redis-cli ping

# ML servis health check
curl http://localhost:8001/health
```

**Çözüm:**
- `.env` dosyasında `REDIS_URL` ayarını kontrol et
- Redis servisinin çalıştığından emin ol

#### 3. Veritabanı Bağlantısı Yok
**Belirti:** Loglarda "Database connection failed" hatası.

**Kontrol:**
```bash
# Veritabanı bağlantısını test et
mysql -h 92.113.22.70 -u u987029066_Admin -p u987029066_mobil
```

**Çözüm:**
- `.env` dosyasında veritabanı bilgilerini kontrol et
- Firewall ayarlarını kontrol et
- Veritabanı kullanıcı izinlerini kontrol et

#### 4. Event Gönderilmiyor
**Belirti:** Redis queue'da event yok.

**Kontrol:**
```bash
# Redis queue'yu kontrol et
redis-cli LLEN ml:events

# Test event gönder
curl -X POST http://localhost:8001/api/test-event
```

**Çözüm:**
- Node.js server'ın `mlService.sendEventToML()` fonksiyonunu çağırdığından emin ol
- `/api/user-data/behavior/track` endpoint'inin çalıştığını kontrol et

#### 5. Tablolar Oluşturulmamış
**Belirti:** Veritabanı hatası "Table doesn't exist".

**Çözüm:**
```sql
-- Tabloları oluştur
CREATE TABLE IF NOT EXISTS ml_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    tenantId INT DEFAULT 1,
    predictionType VARCHAR(50) NOT NULL,
    probability DECIMAL(5,4) NOT NULL,
    metadata TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (userId, tenantId),
    INDEX idx_created (createdAt)
);

CREATE TABLE IF NOT EXISTS ml_anomalies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId VARCHAR(255),
    userId INT,
    tenantId INT DEFAULT 1,
    anomalyScore DECIMAL(5,4) NOT NULL,
    anomalyType VARCHAR(50) NOT NULL,
    metadata TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (userId, tenantId),
    INDEX idx_created (createdAt)
);

CREATE TABLE IF NOT EXISTS ml_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    tenantId INT DEFAULT 1,
    productIds TEXT NOT NULL,
    scores TEXT NOT NULL,
    metadata TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (userId, tenantId),
    INDEX idx_created (createdAt)
);

CREATE TABLE IF NOT EXISTS ml_segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    tenantId INT DEFAULT 1,
    segmentId INT NOT NULL,
    segmentName VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    metadata TEXT,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (userId, tenantId),
    INDEX idx_segment (segmentId),
    INDEX idx_updated (updatedAt)
);
```

### Debug Adımları

1. **ML Servis Loglarını Kontrol Et:**
```bash
# PM2 ile çalışıyorsa
pm2 logs ml-service

# Direkt çalışıyorsa
cd ml-service
python main.py
```

2. **Health Check:**
```bash
curl http://localhost:8001/health
```

3. **İstatistikleri Kontrol Et:**
```bash
curl http://localhost:8001/api/stats
```

4. **Test Event Gönder:**
```bash
curl -X POST http://localhost:8001/api/test-event
```

5. **Redis Queue'yu Kontrol Et:**
```bash
redis-cli LLEN ml:events
redis-cli LRANGE ml:events 0 -1
```

### Önemli Notlar

- Modeller eğitilmeden tahmin yapılamaz
- Event'ler Redis queue'ya gönderilmeden işlenmez
- Veritabanı tabloları oluşturulmalı
- Tüm servislerin çalıştığından emin ol

