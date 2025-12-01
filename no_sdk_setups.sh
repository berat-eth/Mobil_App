#!/bin/bash

# ========================================
# Huglu + AI Service Full Stack Deployment Script
# SDK Tools Disabled - Only Project Dependencies
# Debian 11 Bullseye Optimized
# Interactive Menu System
# PORT & NGINX CONFLICT FIXED
# ========================================

set -e

# --------------------------
# Colors
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# --------------------------
# Variables
# --------------------------
# Main Site
MAIN_DOMAIN="huglutekstil.com"
MAIN_DIR="/root/final_versiyonn/web"
MAIN_PORT=3006
MAIN_PM2_NAME="huglu-web"

# API
API_DOMAIN="api.huglutekstil.com"
API_DIR="/root/final_versiyonn/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

# Admin Panel
ADMIN_DOMAIN="admin.huglutekstil.com"
ADMIN_DIR="/root/final_versiyonn/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

# AI/ML Service
AI_DIR="/root/final_versiyonn/ml-service"
AI_PORT=8001
AI_PM2_NAME="ml-service"

# Redis
REDIS_PORT=6379
REDIS_MAXMEMORY="256mb"
REDIS_MAXMEMORY_POLICY="allkeys-lru"

EMAIL="berat@beratsimsek.com.tr"

ERRORS=0
WARNINGS=0
SKIP_ADMIN=false
SKIP_MAIN=false
SKIP_AI=false

# --------------------------
# Root Check
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run as root!${NC}"
    exit 1
fi

# --------------------------
# Helper Functions
# --------------------------
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_menu() {
    clear
    print_header "Huglu Tekstil Dağıtım Yöneticisi"
    echo -e "${GREEN}Debian 11 Bullseye Optimize Edilmiş${NC}"
    echo ""
    echo -e "${YELLOW}Ana Menü:${NC}"
    echo -e "  ${CYAN}1)${NC} Tam Kurulum (Tüm Servisler)"
    echo -e "  ${CYAN}2)${NC} Sadece Temel Servisleri Kur (Web, API, Admin, AI)"
    echo -e "  ${CYAN}3)${NC} Tüm Servisleri Yeniden Başlat"
    echo -e "  ${CYAN}4)${NC} Sistem Durumunu Görüntüle"
    echo -e "  ${CYAN}5)${NC} Çıkış"
    echo ""
}

pause_screen() {
    echo ""
    read -p "Devam etmek için Enter'a basın..."
}

# --------------------------
# Port Check Function
# --------------------------
check_port_usage() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}  Port $port zaten kullanımda ($service_name için)${NC}"
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        local process=$(ps -p $pid -o comm=)
        echo -e "${YELLOW}   Process: $process (PID: $pid)${NC}"
        
        read -p "Bu portu kullanan servisi durdurmak ister misiniz? [e/H]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ee]$ ]]; then
            kill -9 $pid 2>/dev/null || true
            echo -e "${GREEN} Port $port temizlendi${NC}"
            return 0
        else
            echo -e "${RED} Port çakışması çözülmedi. Kurulum devam edemiyor.${NC}"
            return 1
        fi
    fi
    return 0
}

# --------------------------
# Restart All Services Function
# --------------------------
restart_all_services() {
    clear
    print_header "Tüm Servisleri Yeniden Başlatma"
    
    echo -e "${YELLOW}Hangi servisleri yeniden başlatmak istiyorsunuz?${NC}"
    echo ""
    echo -e "  ${CYAN}1)${NC} Sadece PM2 Servisleri (Web, API, Admin, AI)"
    echo -e "  ${CYAN}2)${NC} Sadece Sistem Servisleri (Nginx, Redis)"
    echo -e "  ${CYAN}3)${NC} TÜM SERVİSLER (PM2 + Sistem)"
    echo -e "  ${CYAN}4)${NC} İptal"
    echo ""
    read -p "Seçiminiz [1-4]: " restart_choice
    
    case $restart_choice in
        1)
            echo -e "${BLUE}PM2 servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart PM2 services
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            if pm2 describe $AI_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $AI_PM2_NAME${NC}"
                pm2 restart $AI_PM2_NAME
            fi
            
            echo ""
            echo -e "${GREEN} PM2 servisleri yeniden başlatıldı!${NC}"
            echo ""
            pm2 list
            ;;
            
        2)
            echo -e "${BLUE}Sistem servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            nginx -t && systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN} Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Restart Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN} Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED} Redis yeniden başlatılamadı!${NC}"
            fi
            
            echo ""
            echo -e "${GREEN} Sistem servisleri yeniden başlatıldı!${NC}"
            ;;
            
        3)
            echo -e "${BLUE}TÜM SERVİSLER yeniden başlatılıyor...${NC}"
            echo ""
            
            # PM2 Services
            echo -e "${MAGENTA}=== PM2 Servisleri ===${NC}"
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            if pm2 describe $AI_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $AI_PM2_NAME${NC}"
                pm2 restart $AI_PM2_NAME
            fi
            
            echo ""
            echo -e "${MAGENTA}=== Sistem Servisleri ===${NC}"
            
            # Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            nginx -t && systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN} Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN} Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
            echo ""
            echo -e "${GREEN} TÜM SERVİSLER başarıyla yeniden başlatıldı!${NC}"
            echo ""
            echo -e "${BLUE}PM2 Durumu:${NC}"
            pm2 list
            ;;
            
        4)
            echo -e "${YELLOW}İptal edildi.${NC}"
            return
            ;;
            
        *)
            echo -e "${RED}Geçersiz seçenek!${NC}"
            ;;
    esac
}

# --------------------------
# System Status Function
# --------------------------
show_system_status() {
    clear
    print_header "Sistem Durumu"
    
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}PM2 Servisleri:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    pm2 list
    echo ""
    
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}Sistem Servisleri:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN} Nginx: Çalışıyor${NC}"
    else
        echo -e "${RED} Nginx: Durdurulmuş${NC}"
    fi
    
    # Redis
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN} Redis: Çalışıyor${NC}"
    else
        echo -e "${RED} Redis: Durdurulmuş${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}Port Kullanımı:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    
    check_port_display() {
        local port=$1
        local service=$2
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -1 | awk '{print $1}')
            echo -e "${GREEN} Port $port: $service ($process)${NC}"
        else
            echo -e "${RED} Port $port: $service (Kullanımda Değil)${NC}"
        fi
    }
    
    check_port_display 80 "Nginx"
    check_port_display 443 "Nginx SSL"
    check_port_display $MAIN_PORT "Main Site"
    check_port_display $API_PORT "API"
    check_port_display $ADMIN_PORT "Admin"
    check_port_display $AI_PORT "AI Service"
    check_port_display $REDIS_PORT "Redis"
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}Public Domain URLs:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}Ana Site:${NC} https://$MAIN_DOMAIN"
    echo -e "  ${CYAN}API:${NC} https://$API_DOMAIN"
    echo -e "  ${CYAN}Admin:${NC} https://$ADMIN_DOMAIN"
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}Internal Services:${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}AI/ML Service:${NC} http://localhost:${AI_PORT}"
    echo -e "  ${CYAN}Redis:${NC} localhost:${REDIS_PORT}"
    echo ""
}

# --------------------------
# Core Installation Functions
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[DÜZELTME] Mevcut PM2 ve Nginx yapılandırmaları temizleniyor...${NC}"
    pm2 delete $MAIN_PM2_NAME 2>/dev/null || true
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    pm2 delete $AI_PM2_NAME 2>/dev/null || true

    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx config and reload
    nginx -t && systemctl reload nginx || true
}

install_system_packages() {
    echo -e "${BLUE}[1/7] Sistem güncelleniyor...${NC}"
    apt update -y && apt upgrade -y

    # Required packages for Debian 11
    apt install -y \
        net-tools \
        lsof \
        curl \
        wget \
        git \
        nginx \
        ufw \
        build-essential \
        python3 \
        python3-pip \
        python3-dev \
        python3-venv \
        python3-certbot-nginx \
        ca-certificates \
        gnupg \
        lsb-release \
        apt-transport-https \
        software-properties-common \
        unzip \
        zip \
        redis-server
}

install_redis() {
    echo -e "${BLUE}[2/7] Redis kuruluyor ve yapılandırılıyor...${NC}"

    # Stop Redis
    systemctl stop redis-server 2>/dev/null || true

    # Backup Redis config
    if [ -f /etc/redis/redis.conf ]; then
        cp /etc/redis/redis.conf /etc/redis/redis.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Create new Redis configuration (No Password)
    cat > /etc/redis/redis.conf << 'REDISCONF'
# Redis Configuration - No Username/Password (Localhost Only)

# Network - Only localhost access
bind 127.0.0.1 ::1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Append Only File
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
REDISCONF

    # Set Redis directory permissions
    mkdir -p /var/lib/redis
    mkdir -p /var/log/redis
    mkdir -p /var/run/redis
    chown -R redis:redis /var/lib/redis
    chown -R redis:redis /var/log/redis
    chown -R redis:redis /var/run/redis
    chmod 750 /var/lib/redis
    chmod 750 /var/log/redis

    # Configure Redis service
    systemctl enable redis-server
    systemctl start redis-server

    # Check Redis status
    sleep 2
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN} Redis başarıyla kuruldu ve başlatıldı${NC}"
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN} Redis bağlantı testi başarılı (PONG)${NC}"
        fi
    else
        echo -e "${RED} Redis başlatılamadı!${NC}"
    fi
}

install_nodejs() {
    echo -e "${BLUE}[3/7] Node.js ve PM2 kuruluyor...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi

    npm install -g pm2 npm@latest

    node --version
    npm --version
}

clone_repository() {
    echo -e "${BLUE}[4/7] Repository klonlanıyor...${NC}"
    if [ ! -d "/root/final_versiyonn" ]; then
        git clone https://github.com/berat-eth/final_versiyonn.git /root/final_versiyonn
    else
        cd /root/final_versiyonn
        git pull origin main || git pull origin master || true
    fi
}

install_main_site() {
    echo -e "${BLUE}[5/7] Ana site kuruluyor (Next.js)...${NC}"
    if [ -d "$MAIN_DIR" ]; then
        cd $MAIN_DIR
        
        # Check port availability
        check_port_usage $MAIN_PORT "Main Site" || return 1
        
        npm install
        npm run build
        
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${MAIN_PM2_NAME}',
    script: 'npm',
    args: 'start',
    cwd: '${MAIN_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: ${MAIN_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT}
    }
  }]
};
EOF
        
        mkdir -p logs
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "${GREEN} Next.js ana site başarıyla kuruldu${NC}"
    else
        echo -e "${YELLOW}  Web dizini bulunamadı, atlanıyor...${NC}"
        SKIP_MAIN=true
    fi
}

install_api() {
    echo -e "${BLUE}[6/7] API kuruluyor...${NC}"
    if [ -d "$API_DIR" ]; then
        cd $API_DIR
        
        # Check port availability
        check_port_usage $API_PORT "API" || return 1
        
        if [ -f ".env" ]; then
            if ! grep -q "REDIS_HOST" .env; then
                echo "" >> .env
                echo "REDIS_HOST=127.0.0.1" >> .env
                echo "REDIS_PORT=${REDIS_PORT}" >> .env
            fi
            if ! grep -q "AI_SERVICE_URL" .env; then
                echo "AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}" >> .env
            fi
        else
            cat > .env << ENVEOF
REDIS_HOST=127.0.0.1
REDIS_PORT=${REDIS_PORT}
AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}
ENVEOF
        fi
        
        npm install --production
        pm2 start server.js --name $API_PM2_NAME --time
        pm2 save
        echo -e "${GREEN}✅ API başarıyla kuruldu${NC}"
    fi
}

install_admin() {
    if [ -d "$ADMIN_DIR" ]; then
        echo -e "${BLUE}Admin Panel kuruluyor...${NC}"
        cd $ADMIN_DIR
        
        # Check port availability
        check_port_usage $ADMIN_PORT "Admin Panel" || return 1
        
        npm install
        npm run build
        PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
        pm2 save
        echo -e "${GREEN}✅ Admin panel başarıyla kuruldu${NC}"
    else
        SKIP_ADMIN=true
    fi
}

install_ai_service() {
    echo -e "${BLUE}[7/7] AI/ML Servisi kuruluyor...${NC}"
    if [ -d "$AI_DIR" ]; then
        cd $AI_DIR
        
        # Check port availability
        check_port_usage $AI_PORT "AI Service" || return 1
        
        python3 -m pip install --upgrade pip
        
        if [ -f "requirements.txt" ]; then
            pip3 install -r requirements.txt
            
            if [ -f "main.py" ]; then
                mkdir -p logs
                
                cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${AI_PM2_NAME}',
    script: 'python3',
    args: 'main.py',
    cwd: '${AI_DIR}',
    interpreter: 'none',
    env: {
      PORT: ${AI_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT},
      PYTHONUNBUFFERED: '1'
    }
  }]
};
EOF
                
                pm2 start ecosystem.config.js
                pm2 save
                
                echo -e "${GREEN} AI/ML Servisi başarıyla kuruldu${NC}"
            fi
        fi
    else
        SKIP_AI=true
    fi
}

configure_nginx() {
    echo -e "${BLUE}Nginx yapılandırılıyor...${NC}"

    # Main Site
    if [ "$SKIP_MAIN" != true ]; then
    cat > /etc/nginx/sites-available/$MAIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name huglutekstil.com www.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$MAIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    # API
    cat > /etc/nginx/sites-available/$API_DOMAIN << 'EOF'
server {
    listen 80;
    server_name api.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

    # Admin
    if [ "$SKIP_ADMIN" != true ]; then
    cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name admin.huglutekstil.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN} Nginx yapılandırması başarıyla yüklendi${NC}"
    else
        echo -e "${RED} Nginx yapılandırma hatası!${NC}"
        nginx -t
    fi
}

install_ssl() {
    echo -e "${BLUE}SSL sertifikaları kuruluyor...${NC}"

    if [ "$SKIP_MAIN" != true ]; then
        certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
            echo -e "${YELLOW}  $MAIN_DOMAIN için SSL kurulumu başarısız${NC}"
        }
    fi

    certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
        echo -e "${YELLOW}  $API_DOMAIN için SSL kurulumu başarısız${NC}"
    }

    if [ "$SKIP_ADMIN" != true ]; then
        certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
            echo -e "${YELLOW}  $ADMIN_DOMAIN için SSL kurulumu başarısız${NC}"
        }
    fi

    # Auto renewal
    (crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
}

configure_firewall() {
    echo -e "${BLUE}Firewall yapılandırılıyor...${NC}"
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
    echo -e "${GREEN} Firewall yapılandırıldı${NC}"
}

setup_pm2_startup() {
    pm2 startup systemd -u root --hp /root
    pm2 save
    echo -e "${GREEN} PM2 startup yapılandırıldı${NC}"
}

# --------------------------
# Full Installation Function
# --------------------------
full_installation() {
    print_header "Tam Kurulum Başlatılıyor"
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    install_ai_service
    configure_nginx
    install_ssl
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Kurulum Tamamlandı!"
    echo -e "${GREEN}Tüm servisler başarıyla kuruldu!${NC}"
    echo ""
    show_system_status
}

# --------------------------
# Core Services Only Installation
# --------------------------
core_installation() {
    print_header "Sadece Temel Servisler Kuruluyor"
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    install_ai_service
    configure_nginx
    install_ssl
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Temel Kurulum Tamamlandı!"
    echo -e "${GREEN}Temel servisler başarıyla kuruldu!${NC}"
    echo ""
    show_system_status
}

# --------------------------
# Main Menu Loop
# --------------------------
main_menu() {
    while true; do
        print_menu
        read -p "Bir seçenek seçin [1-5]: " choice
        
        case $choice in
            1)
                full_installation
                pause_screen
                ;;
            2)
                core_installation
                pause_screen
                ;;
            3)
                restart_all_services
                pause_screen
                ;;
            4)
                show_system_status
                pause_screen
                ;;
            5)
                echo -e "${GREEN}Çıkılıyor...${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Geçersiz seçenek! Lütfen 1-5 arası seçin${NC}"
                pause_screen
                ;;
        esac
    done
}

# --------------------------
# Start Script
# --------------------------
print_header "Huglu Tekstil Dağıtım Yöneticisi"
echo -e "${CYAN}Debian 11 Bullseye Optimize Edilmiş${NC}"
echo -e "${CYAN}Port Çakışmaları Düzeltildi${NC}"
echo -e "${YELLOW}Başlatılıyor...${NC}"
sleep 1

# Start main menu
main_menu