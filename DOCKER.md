# Docker Kurulum ve Kullanım Kılavuzu

Bu dokümantasyon, Huğlu Outdoor projesinin web, admin ve API kısımlarını Docker'da nasıl çalıştıracağınızı açıklar.

## 📋 Gereksinimler

- Docker 20.10+
- Docker Compose 2.0+
- En az 4GB RAM
- En az 10GB boş disk alanı

## 🚀 Hızlı Başlangıç

### 1. Environment Dosyasını Oluşturun

```bash
cp env.example .env
```

`.env` dosyasını düzenleyip gerekli değerleri ayarlayın (özellikle şifreler ve API key'ler).

### 2. Tüm Servisleri Başlatın

```bash
docker-compose up -d
```

Bu komut şunları başlatır:
- MySQL veritabanı (port 3306)
- Redis cache (port 6379)
- Backend API (port 3000)
- ML Servisi (port 8001)
- Web sitesi (port 3006)
- Admin paneli (port 3001)

### 3. Servisleri Kontrol Edin

```bash
docker-compose ps
```

Tüm servislerin `Up` durumunda olduğunu kontrol edin.

### 4. Logları İzleyin

```bash
# Tüm servislerin logları
docker-compose logs -f

# Sadece API logları
docker-compose logs -f api

# Sadece web logları
docker-compose logs -f web
```

## 🔧 Servis Yönetimi

### Servisleri Durdurma

```bash
docker-compose down
```

### Servisleri Yeniden Başlatma

```bash
docker-compose restart
```

### Belirli Bir Servisi Yeniden Başlatma

```bash
docker-compose restart api
```

### Servisleri Güncelleme

```bash
# Kod değişikliklerinden sonra
docker-compose build
docker-compose up -d
```

## 🌐 Erişim URL'leri

Servisler başlatıldıktan sonra şu URL'lerden erişebilirsiniz:

- **Web Sitesi**: http://localhost:3006
- **Admin Paneli**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **ML Servisi**: http://localhost:8001
- **API Health Check**: http://localhost:3000/api/health

## 📊 Veritabanı Yönetimi

### Veritabanına Bağlanma

```bash
docker-compose exec mysql mysql -u huglu_user -p huglu_db
```

### Veritabanı Yedekleme

```bash
docker-compose exec mysql mysqldump -u huglu_user -p huglu_db > backup.sql
```

### Veritabanı Geri Yükleme

```bash
docker-compose exec -T mysql mysql -u huglu_user -p huglu_db < backup.sql
```

## 🔍 Sorun Giderme

### Servisler Başlamıyor

1. Port çakışması kontrolü:
```bash
# Port kullanımını kontrol edin
netstat -an | grep -E '3000|3001|3006|3306|6379|8001'
```

2. Logları kontrol edin:
```bash
docker-compose logs api
docker-compose logs mysql
```

### Veritabanı Bağlantı Hatası

1. MySQL'in hazır olduğunu kontrol edin:
```bash
docker-compose exec mysql mysqladmin ping -h localhost -u root -p
```

2. Environment değişkenlerini kontrol edin:
```bash
docker-compose exec api env | grep DB_
```

### Next.js Build Hatası

1. Node modüllerini temizleyin:
```bash
cd web
rm -rf node_modules .next
cd ../admin-panel
rm -rf node_modules .next
```

2. Docker image'larını yeniden oluşturun:
```bash
docker-compose build --no-cache web admin
```

## 🛠️ Geliştirme Modu

Geliştirme için hot-reload özelliği ile çalıştırmak isterseniz:

### Backend API (Development)

```bash
cd server
npm install
npm run dev
```

### Web Sitesi (Development)

```bash
cd web
npm install
npm run dev
```

### Admin Paneli (Development)

```bash
cd admin-panel
npm install
npm run dev
```

## 📦 Volume Yönetimi

Docker volume'ları şunları içerir:
- `mysql_data`: MySQL veritabanı verileri
- `redis_data`: Redis cache verileri
- `api_uploads`: API yüklenen dosyalar
- `api_logs`: API log dosyaları
- `api_tmp`: API geçici dosyalar
- `ml_models`: ML model dosyaları

### Volume'ları Görüntüleme

```bash
docker volume ls | grep huglu
```

### Volume'u Silme (DİKKAT: Veri kaybına neden olur)

```bash
docker-compose down -v
```

## 🔐 Güvenlik Notları

1. **Production'da mutlaka değiştirin:**
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_TOKEN`
   - `ADMIN_KEY`
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_PASSWORD`

2. **API Key'leri güvenli tutun:**
   - `.env` dosyasını git'e commit etmeyin
   - Production'da farklı API key'ler kullanın

3. **Firewall ayarları:**
   - Production'da sadece gerekli portları açın
   - MySQL ve Redis portlarını dışarıya açmayın

## 📝 Environment Değişkenleri

Detaylı environment değişkenleri için `env.example` dosyasına bakın.

## 🚀 Production Deployment

Production için:

1. `.env` dosyasını production değerleriyle doldurun
2. `NODE_ENV=production` ayarlayın
3. Güvenlik ayarlarını kontrol edin
4. Reverse proxy (Nginx) kullanın
5. SSL sertifikası ekleyin

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin: `docker-compose logs`
2. Servis durumunu kontrol edin: `docker-compose ps`
3. Health check'leri kontrol edin: `docker-compose ps` (HEALTHY durumunu kontrol edin)

