# Backend API Dockerfile
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# Sistem bağımlılıklarını yükle (Playwright için gerekli)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Playwright için chromium path'i ayarla
ENV PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Package dosyalarını kopyala
COPY package*.json ./

# Production bağımlılıklarını yükle
RUN npm ci --only=production && npm cache clean --force

# Uygulama kodunu kopyala
COPY . .

# Logs dizinini oluştur
RUN mkdir -p logs tmp uploads

# Port'u expose et
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Uygulamayı başlat
CMD ["node", "server.js"]

