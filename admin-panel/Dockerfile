# Admin Paneli Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm ci

# Uygulama kodunu kopyala
COPY . .

# Next.js build
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sistem kullanıcısı oluştur
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Puppeteer için gerekli bağımlılıklar
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Puppeteer için chromium path'i ayarla
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Gerekli dosyaları kopyala
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Kullanıcı izinlerini ayarla
RUN chown -R nextjs:nodejs /app

USER nextjs

# Port'u expose et
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Uygulamayı başlat
CMD ["node", "server.js"]

