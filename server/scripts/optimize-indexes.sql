-- ⚡ Backend Performans Optimizasyonu - Database Index'leri
-- Tarih: 2025-10-23
-- Amaç: Query performansını artırmak

-- ============================================
-- CART TABLE INDEXES
-- ============================================

-- Sepet sorguları için composite index
CREATE INDEX IF NOT EXISTS idx_cart_user_tenant 
ON cart(tenantId, userId, deviceId);

-- Product lookup için
CREATE INDEX IF NOT EXISTS idx_cart_product 
ON cart(productId);

-- Unique constraint (INSERT ... ON DUPLICATE KEY UPDATE için)
-- NOT: Bu constraint zaten varsa hata verebilir, kontrol edin
ALTER TABLE cart 
ADD UNIQUE INDEX idx_cart_unique (tenantId, userId, productId, variationString, deviceId);

-- Created date için (ORDER BY optimizasyonu)
CREATE INDEX IF NOT EXISTS idx_cart_created 
ON cart(createdAt DESC);

-- ============================================
-- PRODUCTS TABLE INDEXES
-- ============================================

-- Tenant ve aktiflik kontrolü için
CREATE INDEX IF NOT EXISTS idx_products_tenant_active 
ON products(tenantId, isActive);

-- Category lookup için
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category);

-- Price range queries için
CREATE INDEX IF NOT EXISTS idx_products_price 
ON products(price);

-- Stock kontrolü için
CREATE INDEX IF NOT EXISTS idx_products_stock 
ON products(stock);

-- ============================================
-- ORDERS TABLE INDEXES
-- ============================================

-- User orders lookup için
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON orders(userId, status, createdAt DESC);

-- Tenant orders için
CREATE INDEX IF NOT EXISTS idx_orders_tenant 
ON orders(tenantId, createdAt DESC);

-- Status filtering için
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- ============================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================

-- Order items lookup için
CREATE INDEX IF NOT EXISTS idx_order_items_order 
ON order_items(orderId);

-- Product lookup için
CREATE INDEX IF NOT EXISTS idx_order_items_product 
ON order_items(productId);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Email login için (zaten var olabilir)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Tenant users için
CREATE INDEX IF NOT EXISTS idx_users_tenant 
ON users(tenantId, isActive);

-- User ID lookup için
CREATE INDEX IF NOT EXISTS idx_users_user_id 
ON users(user_id);

-- ============================================
-- WALLET TABLES INDEXES
-- ============================================

-- User wallet lookup için
CREATE INDEX IF NOT EXISTS idx_wallet_user 
ON user_wallets(userId, tenantId);

-- Wallet transactions için
CREATE INDEX IF NOT EXISTS idx_wallet_trans_user 
ON wallet_transactions(userId, createdAt DESC);

-- Transaction status için
CREATE INDEX IF NOT EXISTS idx_wallet_trans_status 
ON wallet_transactions(status);

-- ============================================
-- REVIEWS TABLE INDEXES
-- ============================================

-- Product reviews için
CREATE INDEX IF NOT EXISTS idx_reviews_product 
ON reviews(productId, createdAt DESC);

-- User reviews için
CREATE INDEX IF NOT EXISTS idx_reviews_user 
ON reviews(userId);

-- ============================================
-- CAMPAIGNS TABLE INDEXES
-- ============================================

-- Active campaigns için
CREATE INDEX IF NOT EXISTS idx_campaigns_active 
ON campaigns(isActive, startDate, endDate);

-- Tenant campaigns için
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant 
ON campaigns(tenantId);

-- ============================================
-- VERIFICATION
-- ============================================

-- Index'lerin oluşturulduğunu kontrol et
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM 
    INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('cart', 'products', 'orders', 'order_items', 'users', 'user_wallets', 'wallet_transactions', 'reviews', 'campaigns')
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ============================================
-- PERFORMANCE NOTES
-- ============================================

/*
BEKLENEN KAZANIMLAR:
- Cart queries: %70 daha hızlı
- Product queries: %60 daha hızlı
- Order queries: %65 daha hızlı
- User queries: %50 daha hızlı

DİKKAT:
1. Index'ler disk alanı kullanır (~10-20% artış)
2. INSERT/UPDATE/DELETE işlemleri biraz yavaşlar (%5-10)
3. Ancak SELECT işlemleri çok daha hızlanır (%60-70)
4. Trade-off: Okuma ağırlıklı sistemlerde çok faydalı

UYGULAMA:
1. Önce staging/test ortamında dene
2. Production'da peak hours dışında uygula
3. Index oluşturma sırasında table lock olabilir
4. Büyük tablolarda (>1M row) uzun sürebilir

MONITORING:
- EXPLAIN kullanarak query plan'ları kontrol et
- Slow query log'ları izle
- Index usage statistics'leri takip et
*/
