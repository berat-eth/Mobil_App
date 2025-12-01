#!/bin/bash

# ============================================
# Huğlu Outdoor Docker Kurulum Scripti
# Debian 11 için otomatik kurulum
# ============================================

set -e  # Hata durumunda dur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonları
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Root kontrolü
check_root() {
    if [ "$EUID" -eq 0 ]; then 
        log_error "Bu script root olarak çalıştırılmamalı!"
        log_info "Script otomatik olarak sudo kullanacak."
        exit 1
    fi
}

# Sistem güncellemesi
update_system() {
    log_info "Sistem güncelleniyor..."
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    log_success "Sistem güncellendi"
}

# Gerekli paketleri yükle
install_dependencies() {
    log_info "Gerekli paketler yükleniyor..."
    sudo apt-get install -y -qq \
        curl \
        wget \
        git \
        ca-certificates \
        gnupg \
        lsb-release \
        apt-transport-https \
        software-properties-common
    log_success "Gerekli paketler yüklendi"
}

# Docker kurulumu
install_docker() {
    if command -v docker &> /dev/null; then
        log_warning "Docker zaten yüklü: $(docker --version)"
        read -p "Docker'ı yeniden yüklemek ister misiniz? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Docker kurulumu atlandı"
            return
        fi
    fi

    log_info "Docker kurulumu başlatılıyor..."

    # Eski Docker sürümlerini kaldır
    sudo apt-get remove -y -qq docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Docker repository ekle
    log_info "Docker repository ekleniyor..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Docker yükle
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Kullanıcıyı docker grubuna ekle
    sudo usermod -aG docker $USER

    log_success "Docker kuruldu: $(docker --version)"
    log_warning "Docker grubuna eklenmek için oturumu kapatıp açmanız gerekebilir"
}

# Docker Compose kontrolü
check_docker_compose() {
    if docker compose version &> /dev/null; then
        log_success "Docker Compose mevcut: $(docker compose version)"
        return 0
    else
        log_error "Docker Compose bulunamadı!"
        return 1
    fi
}

# Proje dizinini kontrol et
check_project_directory() {
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml dosyası bulunamadı!"
        log_info "Bu script proje kök dizininde çalıştırılmalıdır."
        exit 1
    fi
    log_success "Proje dizini doğrulandı"
}

# Environment dosyası oluştur
setup_env_file() {
    if [ -f ".env" ]; then
        log_warning ".env dosyası zaten mevcut"
        read -p "Mevcut .env dosyasını üzerine yazmak ister misiniz? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info ".env dosyası oluşturulmadı"
            return
        fi
    fi

    if [ -f "env.example" ]; then
        cp env.example .env
        log_success ".env dosyası oluşturuldu (env.example'dan)"
        log_warning "Lütfen .env dosyasını düzenleyip güvenlik ayarlarını yapın!"
    else
        log_warning "env.example dosyası bulunamadı, varsayılan .env oluşturuluyor..."
        create_default_env
    fi
}

# Varsayılan .env dosyası oluştur
create_default_env() {
    cat > .env << 'EOF'
# Veritabanı Ayarları
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
MYSQL_DATABASE=huglu_db
MYSQL_USER=huglu_user
MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
MYSQL_PORT=3306

# Redis Ayarları
REDIS_PORT=6379
REDIS_QUEUE_NAME=ml:events

# Backend API Ayarları
API_PORT=3000
NODE_ENV=production

# JWT ve Şifreleme (GÜVENLİK: Production'da mutlaka değiştirin!)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Admin Ayarları (GÜVENLİK: Production'da mutlaka değiştirin!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
ADMIN_TOKEN=huglu-admin-token-$(date +%Y)
ADMIN_KEY=huglu-admin-$(date +%Y)-secure-key-CHANGE-THIS

# Google OAuth
GOOGLE_CLIENT_ID=

# İyzico Ödeme Gateway
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://api.iyzipay.com

# ML Servisi Ayarları
ML_SERVICE_PORT=8001
ML_LOG_LEVEL=INFO

# Frontend Ayarları
WEB_PORT=3006
ADMIN_PORT=3001

# API URL'leri
NEXT_PUBLIC_API_URL=http://api:3000/api
NEXT_PUBLIC_API_KEY=huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f

# Opsiyonel Ayarlar
XML_SYNC_ENABLED=true
CSP_REPORT_URI=
DISABLE_SUSPICIOUS_IP_LIMITER=false
EOF

    # Rastgele şifreler oluştur
    if command -v openssl &> /dev/null; then
        MYSQL_ROOT_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        MYSQL_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        ENC_KEY=$(openssl rand -hex 32)
        ADMIN_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
        
        sed -i "s|MYSQL_ROOT_PASSWORD=\$(openssl.*|MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASS|" .env
        sed -i "s|MYSQL_PASSWORD=\$(openssl.*|MYSQL_PASSWORD=$MYSQL_PASS|" .env
        sed -i "s|JWT_SECRET=\$(openssl.*|JWT_SECRET=$JWT_SECRET|" .env
        sed -i "s|ENCRYPTION_KEY=\$(openssl.*|ENCRYPTION_KEY=$ENC_KEY|" .env
        sed -i "s|ADMIN_PASSWORD=\$(openssl.*|ADMIN_PASSWORD=$ADMIN_PASS|" .env
    fi

    log_success ".env dosyası oluşturuldu (rastgele şifrelerle)"
}

# Docker servislerini başlat
start_services() {
    log_info "Docker servisleri başlatılıyor..."
    
    # Docker daemon'ın çalıştığını kontrol et
    if ! sudo systemctl is-active --quiet docker; then
        log_info "Docker daemon başlatılıyor..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi

    # Docker Compose ile servisleri başlat
    log_info "Docker Compose ile servisler başlatılıyor..."
    docker compose pull -q
    docker compose build --quiet
    docker compose up -d

    log_success "Docker servisleri başlatıldı"
}

# Servis durumunu kontrol et
check_services() {
    log_info "Servis durumları kontrol ediliyor..."
    sleep 5
    
    echo ""
    echo "=========================================="
    echo "  Servis Durumları"
    echo "=========================================="
    docker compose ps
    
    echo ""
    echo "=========================================="
    echo "  Health Check Sonuçları"
    echo "=========================================="
    
    # API Health Check
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Backend API çalışıyor (http://localhost:3000/api)"
    else
        log_warning "Backend API henüz hazır değil (birkaç saniye bekleyin)"
    fi
    
    # Web Health Check
    if curl -sf http://localhost:3006 > /dev/null 2>&1; then
        log_success "Web sitesi çalışıyor (http://localhost:3006)"
    else
        log_warning "Web sitesi henüz hazır değil (birkaç saniye bekleyin)"
    fi
    
    # Admin Health Check
    if curl -sf http://localhost:3001 > /dev/null 2>&1; then
        log_success "Admin paneli çalışıyor (http://localhost:3001)"
    else
        log_warning "Admin paneli henüz hazır değil (birkaç saniye bekleyin)"
    fi
    
    # ML Service Health Check
    if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
        log_success "ML Servisi çalışıyor (http://localhost:8001)"
    else
        log_warning "ML Servisi henüz hazır değil (birkaç saniye bekleyin)"
    fi
}

# Port kontrolü
check_ports() {
    log_info "Port kullanımı kontrol ediliyor..."
    
    PORTS=(3000 3001 3006 3306 6379 8001)
    CONFLICTS=()
    
    for port in "${PORTS[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            CONFLICTS+=($port)
        fi
    done
    
    if [ ${#CONFLICTS[@]} -gt 0 ]; then
        log_warning "Aşağıdaki portlar kullanımda: ${CONFLICTS[*]}"
        log_info "Bu portlar Docker tarafından kullanılacak, çakışma olabilir"
        read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "Tüm portlar müsait"
    fi
}

# Firewall kuralları (opsiyonel)
setup_firewall() {
    if command -v ufw &> /dev/null; then
        log_info "UFW firewall kuralları ekleniyor..."
        read -p "Firewall kuralları eklemek ister misiniz? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ufw allow 3000/tcp comment "Backend API"
            sudo ufw allow 3001/tcp comment "Admin Panel"
            sudo ufw allow 3006/tcp comment "Web Site"
            sudo ufw allow 8001/tcp comment "ML Service"
            log_success "Firewall kuralları eklendi"
        fi
    fi
}

# Özet bilgileri göster
show_summary() {
    echo ""
    echo "=========================================="
    echo "  Kurulum Tamamlandı! 🎉"
    echo "=========================================="
    echo ""
    echo "Erişim URL'leri:"
    echo "  • Web Sitesi:     http://localhost:3006"
    echo "  • Admin Paneli:   http://localhost:3001"
    echo "  • Backend API:    http://localhost:3000/api"
    echo "  • ML Servisi:     http://localhost:8001"
    echo ""
    echo "Yararlı Komutlar:"
    echo "  • Logları görüntüle:  docker compose logs -f"
    echo "  • Servisleri durdur: docker compose down"
    echo "  • Servisleri başlat:  docker compose up -d"
    echo "  • Servis durumları:   docker compose ps"
    echo ""
    echo "ÖNEMLİ:"
    echo "  1. .env dosyasını kontrol edip güvenlik ayarlarını yapın"
    echo "  2. Production'da mutlaka şifreleri değiştirin"
    echo "  3. Docker grubuna eklenmek için oturumu kapatıp açın"
    echo ""
    
    if [ -f ".env" ]; then
        echo "Oluşturulan şifreler .env dosyasında saklanıyor."
        echo "Güvenlik için .env dosyasını güvenli tutun!"
    fi
}

# Ana kurulum fonksiyonu
main() {
    clear
    echo "=========================================="
    echo "  Huğlu Outdoor Docker Kurulum Scripti"
    echo "  Debian 11 için Otomatik Kurulum"
    echo "=========================================="
    echo ""
    
    # Root kontrolü
    check_root
    
    # Port kontrolü
    check_ports
    
    # Proje dizini kontrolü
    check_project_directory
    
    # Sistem güncellemesi
    read -p "Sistem güncellemesi yapılsın mı? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        update_system
    fi
    
    # Bağımlılıkları yükle
    install_dependencies
    
    # Docker kurulumu
    install_docker
    
    # Docker Compose kontrolü
    if ! check_docker_compose; then
        log_error "Docker Compose kurulumu başarısız!"
        exit 1
    fi
    
    # Environment dosyası
    setup_env_file
    
    # Firewall (opsiyonel)
    setup_firewall
    
    # Servisleri başlat
    start_services
    
    # Servis durumlarını kontrol et
    check_services
    
    # Özet
    show_summary
}

# Script'i çalıştır
main

