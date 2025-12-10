// Generate 8-digit user ID
function generateUserId() {
  // Generate a random 8-digit number
  const min = 10000000; // 8 digits starting with 1
  const max = 99999999; // 8 digits ending with 9
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Database schema creation
async function createDatabaseSchema(pool) {
  try {
      console.log('🗄️ Checking database schema...');

      // Check if tables already exist
      const [tables] = await pool.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('tenants', 'users', 'products', 'cart', 'orders', 'order_items', 'reviews')
  `);

      const existingTables = tables.map(row => row.TABLE_NAME);
      console.log(`📋 Found existing tables: ${existingTables.join(', ')}`);

      // If all required tables exist, skip schema creation
      const requiredTables = [
          'tenants', 'users', 'user_addresses', 'products', 'product_variations', 'product_variation_options',
          'cart', 'orders', 'order_items', 'reviews', 'user_wallets', 'wallet_transactions',
          'user_lists', 'user_list_items', 'user_favorites_v2',
          'return_requests', 'payment_transactions', 'custom_production_messages', 'custom_production_requests',
          'custom_production_items', 'customer_segments', 'campaigns', 'customer_segment_assignments',
          'campaign_usage', 'customer_analytics', 'discount_wheel_spins', 'chatbot_analytics',
          'wallet_recharge_requests', 'user_discount_codes', 'referral_earnings', 'user_events',
          'user_profiles', 'categories', 'recommendations', 'gift_cards', 'security_events',
          // Segments
          'segments', 'user_segments', 'segment_stats',
          // Warehouse/Inventory
          'warehouses', 'warehouse_locations', 'bins', 'inventory_items', 'inventory_movements',
          'suppliers', 'purchase_orders', 'purchase_order_items',
          // Production
          'bill_of_materials', 'bom_items', 'workstations', 'production_orders', 'production_order_items', 'production_steps', 'material_issues', 'finished_goods_receipts',
          // CRM
          'crm_leads', 'crm_contacts', 'crm_pipeline_stages', 'crm_deals', 'crm_activities',
          // Stories
          'stories',
          // Sliders
          'sliders',
          // Popups
          'popups',
          // User Behavior Analytics
          'anonymous_devices',
          'user_behavior_events',
          'user_sessions',
          'device_analytics_aggregates',
          // Integrations
          'integrations',
          // Invoices
          'invoices'
      ];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      if (missingTables.length === 0) {
          console.log('✅ All required tables already exist, skipping schema creation');
          return true;
      }

      console.log(`🔧 Creating missing tables: ${missingTables.join(', ')}`);

      // Disable foreign key checks temporarily
      await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

      // Tenants table (Multi-tenant support)
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255) UNIQUE,
      subdomain VARCHAR(100) UNIQUE,
      apiKey VARCHAR(255) UNIQUE NOT NULL,
      settings JSON,
      isActive BOOLEAN DEFAULT true,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_domain (domain),
      INDEX idx_subdomain (subdomain),
      INDEX idx_api_key (apiKey),
      INDEX idx_active (isActive)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Tenants table ready');

      // GÜVENLİK: Token blacklist tablosu - JWT token'ları iptal etmek için
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS token_blacklist (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          user_id INT,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token_hash (token_hash),
          INDEX idx_user_id (user_id),
          INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ token_blacklist table created/verified');

      // Security events table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS security_events (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      eventType VARCHAR(64) NOT NULL,
      username VARCHAR(190) NULL,
      ip VARCHAR(64) NULL,
      userAgent VARCHAR(255) NULL,
      details JSON NULL,
      severity ENUM('low','medium','high','critical') DEFAULT 'low',
      detectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved TINYINT(1) DEFAULT 0,
      resolvedAt TIMESTAMP NULL,
      INDEX idx_event_type (eventType),
      INDEX idx_detected_at (detectedAt),
      INDEX idx_security_user (username),
      INDEX idx_security_ip (ip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Security events table ready');

      // Users table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(8) UNIQUE NOT NULL,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      gender ENUM('male', 'female', 'unspecified') DEFAULT 'unspecified',
      birthDate DATE,
      address TEXT,
      referral_code VARCHAR(20) UNIQUE,
      referred_by INT NULL,
      referral_count INT DEFAULT 0,
      privacy_accepted BOOLEAN DEFAULT false,
      terms_accepted BOOLEAN DEFAULT false,
      marketing_email BOOLEAN DEFAULT false,
      marketing_sms BOOLEAN DEFAULT false,
      marketing_phone BOOLEAN DEFAULT false,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_user (tenantId),
      INDEX idx_user_id (user_id),
      INDEX idx_email_tenant (email, tenantId),
      INDEX idx_referral_code (referral_code),
      INDEX idx_referred_by (referred_by),
      UNIQUE KEY unique_email_per_tenant (email, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Users table ready');

      // User addresses table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      tenantId INT NOT NULL,
      addressType ENUM('shipping', 'billing') NOT NULL DEFAULT 'shipping',
      fullName VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      district VARCHAR(100),
      postalCode VARCHAR(20),
      isDefault BOOLEAN DEFAULT false,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_user_tenant (userId, tenantId),
      INDEX idx_address_type (addressType),
      INDEX idx_is_default (isDefault)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User addresses table ready');

      // Check if user_id column exists in users table and add it if it doesn't
      const [userColumns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME IN ('user_id','gender')
  `);
      const existingUserColumns = userColumns.map(col => col.COLUMN_NAME);

      if (!existingUserColumns.includes('user_id')) {
          await pool.execute('ALTER TABLE users ADD COLUMN user_id VARCHAR(8) UNIQUE NOT NULL AFTER id');
          await pool.execute('CREATE INDEX idx_user_id ON users(user_id)');
          console.log('✅ Added user_id column to users table');

          // Generate user_id for existing users
          const [existingUsers] = await pool.execute('SELECT id FROM users WHERE user_id IS NULL OR user_id = ""');
          for (const user of existingUsers) {
              const userId = generateUserId();
              await pool.execute('UPDATE users SET user_id = ? WHERE id = ?', [userId, user.id]);
          }
          console.log('✅ Generated user_id for existing users');
      }

      // Ensure gender column exists
      if (!existingUserColumns.includes('gender')) {
          await pool.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL AFTER phone");
          await pool.execute('CREATE INDEX idx_gender ON users(gender)');
          console.log('✅ Added gender column to users table');
      }

      // Ensure role column exists
      const [userColsAll] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users'
  `);
      const userColsAllNames = userColsAll.map(col => col.COLUMN_NAME);
      if (!userColsAllNames.includes('role')) {
          // Some databases might not have 'referred_by' column; avoid positional AFTER
          await pool.execute("ALTER TABLE users ADD COLUMN role ENUM('user','admin') DEFAULT 'user'");
          await pool.execute('CREATE INDEX idx_role ON users(role)');
          console.log('✅ Added role column to users table');
      }
      if (!userColsAllNames.includes('isActive')) {
          await pool.execute('ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT true AFTER role');
          await pool.execute('CREATE INDEX idx_is_active ON users(isActive)');
          console.log('✅ Added isActive column to users table');
      }
      if (!userColsAllNames.includes('lastLoginAt')) {
          await pool.execute('ALTER TABLE users ADD COLUMN lastLoginAt TIMESTAMP NULL AFTER createdAt');
          await pool.execute('CREATE INDEX idx_last_login ON users(lastLoginAt)');
          console.log('✅ Added lastLoginAt column to users table');
      }

      // Products table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image VARCHAR(500),
      images JSON,
      image1 VARCHAR(500),
      image2 VARCHAR(500),
      image3 VARCHAR(500),
      image4 VARCHAR(500),
      image5 VARCHAR(500),
      stock INT DEFAULT 0,
      brand VARCHAR(100),
      rating DECIMAL(3,2) DEFAULT 0.00,
      reviewCount INT DEFAULT 0,
      externalId VARCHAR(255),
      source VARCHAR(100),
      hasVariations BOOLEAN DEFAULT false,
      isActive BOOLEAN DEFAULT true,
      excludeFromXml BOOLEAN DEFAULT false,
      sku VARCHAR(100),
      lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_product (tenantId),
      INDEX idx_external_id_tenant (externalId, tenantId),
      INDEX idx_source_tenant (source, tenantId),
      INDEX idx_last_updated (lastUpdated),
      INDEX idx_category_tenant (category, tenantId),
      INDEX idx_brand_tenant (brand, tenantId),
      INDEX idx_has_variations (hasVariations),
      INDEX idx_sku_tenant (sku, tenantId),
      UNIQUE KEY unique_external_id_per_tenant (externalId, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Products table ready');

      // Ensure tax columns exist in products
      const [prodCols] = await pool.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
  `);
      const prodColNames = prodCols.map(c => c.COLUMN_NAME);
      if (!prodColNames.includes('taxRate')) {
          await pool.execute('ALTER TABLE products ADD COLUMN taxRate DECIMAL(5,2) DEFAULT 0 AFTER price');
          console.log('✅ Added taxRate to products');
      }
      if (!prodColNames.includes('priceIncludesTax')) {
          await pool.execute('ALTER TABLE products ADD COLUMN priceIncludesTax BOOLEAN DEFAULT false AFTER taxRate');
          console.log('✅ Added priceIncludesTax to products');
      }

      // Ensure XML-related columns exist in products for single-table storage
      if (!prodColNames.includes('categoryTree')) {
          await pool.execute('ALTER TABLE products ADD COLUMN categoryTree TEXT AFTER category');
          console.log('✅ Added categoryTree to products');
      }
      if (!prodColNames.includes('productUrl')) {
          await pool.execute('ALTER TABLE products ADD COLUMN productUrl VARCHAR(1000) AFTER categoryTree');
          await pool.execute('CREATE INDEX idx_product_url ON products(productUrl(191))');
          console.log('✅ Added productUrl to products');
      }
      if (!prodColNames.includes('salesUnit')) {
          await pool.execute('ALTER TABLE products ADD COLUMN salesUnit VARCHAR(50) AFTER productUrl');
          console.log('✅ Added salesUnit to products');
      }
      if (!prodColNames.includes('totalImages')) {
          await pool.execute('ALTER TABLE products ADD COLUMN totalImages INT DEFAULT 0 AFTER image5');
          console.log('✅ Added totalImages to products');
      }
      if (!prodColNames.includes('xmlOptions')) {
          await pool.execute('ALTER TABLE products ADD COLUMN xmlOptions JSON AFTER hasVariations');
          console.log('✅ Added xmlOptions (JSON) to products');
      }
      if (!prodColNames.includes('xmlRaw')) {
          await pool.execute('ALTER TABLE products ADD COLUMN xmlRaw JSON AFTER xmlOptions');
          console.log('✅ Added xmlRaw (JSON) to products');
      }
      if (!prodColNames.includes('variationDetails')) {
          await pool.execute('ALTER TABLE products ADD COLUMN variationDetails JSON AFTER xmlRaw');
          console.log('✅ Added variationDetails (JSON) to products');
      }

      // Ensure image columns exist in products
      if (!prodColNames.includes('image1')) {
          await pool.execute('ALTER TABLE products ADD COLUMN image1 VARCHAR(500) AFTER images');
          console.log('✅ Added image1 to products');
      }
      if (!prodColNames.includes('image2')) {
          await pool.execute('ALTER TABLE products ADD COLUMN image2 VARCHAR(500) AFTER image1');
          console.log('✅ Added image2 to products');
      }
      if (!prodColNames.includes('image3')) {
          await pool.execute('ALTER TABLE products ADD COLUMN image3 VARCHAR(500) AFTER image2');
          console.log('✅ Added image3 to products');
      }
      if (!prodColNames.includes('image4')) {
          await pool.execute('ALTER TABLE products ADD COLUMN image4 VARCHAR(500) AFTER image3');
          console.log('✅ Added image4 to products');
      }
      if (!prodColNames.includes('image5')) {
          await pool.execute('ALTER TABLE products ADD COLUMN image5 VARCHAR(500) AFTER image4');
          console.log('✅ Added image5 to products');
      }
      if (!prodColNames.includes('sku')) {
          await pool.execute('ALTER TABLE products ADD COLUMN sku VARCHAR(100) AFTER hasVariations');
          console.log('✅ Added sku to products');
      }

      // Product Variations table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS product_variations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      displayOrder INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_variations (tenantId),
      INDEX idx_product_variations (productId),
      INDEX idx_variation_name (name),
      UNIQUE KEY unique_product_variation (productId, name, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Product variations table ready');

      // Product Variation Options table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS product_variation_options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      variationId INT NOT NULL,
      value VARCHAR(100) NOT NULL,
      priceModifier DECIMAL(10,2) DEFAULT 0.00,
      stock INT DEFAULT 0,
      sku VARCHAR(100),
      barkod VARCHAR(100),
      alisFiyati DECIMAL(10,2) DEFAULT 0.00,
      satisFiyati DECIMAL(10,2) DEFAULT 0.00,
      indirimliFiyat DECIMAL(10,2) DEFAULT 0.00,
      kdvDahil BOOLEAN DEFAULT false,
      kdvOrani INT DEFAULT 0,
      paraBirimi VARCHAR(10) DEFAULT 'TL',
      paraBirimiKodu VARCHAR(10) DEFAULT 'TRY',
      desi INT DEFAULT 1,
      externalId VARCHAR(100),
      image VARCHAR(500),
      displayOrder INT DEFAULT 0,
      isActive BOOLEAN DEFAULT true,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (variationId) REFERENCES product_variations(id) ON DELETE CASCADE,
      INDEX idx_tenant_options (tenantId),
      INDEX idx_variation_options (variationId),
      INDEX idx_option_value (value),
      INDEX idx_option_sku (sku),
      INDEX idx_option_barkod (barkod),
      INDEX idx_option_external_id (externalId),
      INDEX idx_option_active (isActive),
      UNIQUE KEY unique_variation_option (variationId, value, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Product variation options table ready');

      // Check if new columns exist in product_variation_options and add them if they don't
      const [variationOptionColumns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'product_variation_options'
    AND COLUMN_NAME IN ('barkod', 'alisFiyati', 'satisFiyati', 'indirimliFiyat', 'kdvDahil', 'kdvOrani', 'paraBirimi', 'paraBirimiKodu', 'desi', 'externalId')
  `);

      const existingVariationOptionColumns = variationOptionColumns.map(col => col.COLUMN_NAME);

      if (!existingVariationOptionColumns.includes('barkod')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN barkod VARCHAR(100) AFTER sku');
          await pool.execute('CREATE INDEX idx_option_barkod ON product_variation_options(barkod)');
          console.log('✅ Added barkod column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('alisFiyati')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN alisFiyati DECIMAL(10,2) DEFAULT 0.00 AFTER barkod');
          console.log('✅ Added alisFiyati column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('satisFiyati')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN satisFiyati DECIMAL(10,2) DEFAULT 0.00 AFTER alisFiyati');
          console.log('✅ Added satisFiyati column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('indirimliFiyat')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN indirimliFiyat DECIMAL(10,2) DEFAULT 0.00 AFTER satisFiyati');
          console.log('✅ Added indirimliFiyat column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('kdvDahil')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN kdvDahil BOOLEAN DEFAULT false AFTER indirimliFiyat');
          console.log('✅ Added kdvDahil column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('kdvOrani')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN kdvOrani INT DEFAULT 0 AFTER kdvDahil');
          console.log('✅ Added kdvOrani column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('paraBirimi')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN paraBirimi VARCHAR(10) DEFAULT "TL" AFTER kdvOrani');
          console.log('✅ Added paraBirimi column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('paraBirimiKodu')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN paraBirimiKodu VARCHAR(10) DEFAULT "TRY" AFTER paraBirimi');
          console.log('✅ Added paraBirimiKodu column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('desi')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN desi INT DEFAULT 1 AFTER paraBirimiKodu');
          console.log('✅ Added desi column to product_variation_options table');
      }

      if (!existingVariationOptionColumns.includes('externalId')) {
          await pool.execute('ALTER TABLE product_variation_options ADD COLUMN externalId VARCHAR(100) AFTER desi');
          await pool.execute('CREATE INDEX idx_option_external_id ON product_variation_options(externalId)');
          console.log('✅ Added externalId column to product_variation_options table');
      }

      // Cart table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      deviceId VARCHAR(255) NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      variationString VARCHAR(500),
      selectedVariations JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_cart (tenantId),
      INDEX idx_user_cart (userId),
      INDEX idx_product_cart (productId),
      INDEX idx_device_cart (deviceId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Cart table ready');

      // Ensure deviceId column exists in cart table
      const [cartColumns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cart'
  `);
      const existingCartColumns = cartColumns.map(col => col.COLUMN_NAME);
      if (!existingCartColumns.includes('deviceId')) {
          await pool.execute('ALTER TABLE cart ADD COLUMN deviceId VARCHAR(255) NULL');
          await pool.execute('CREATE INDEX idx_device_cart ON cart(deviceId)');
          console.log('✅ Added deviceId column to cart table');
      }

      // Orders table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      totalAmount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shippingAddress TEXT NOT NULL,
      paymentMethod VARCHAR(100) NOT NULL,
      city VARCHAR(100),
      district VARCHAR(100),
      fullAddress TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_orders (tenantId),
      INDEX idx_user_orders (userId),
      INDEX idx_status_tenant (status, tenantId),
      INDEX idx_city (city),
      INDEX idx_district (district)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      // Check if new columns exist in products table and add them if they don't
      const [productColumns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME IN ('hasVariations')
  `);

      const existingProductColumns = productColumns.map(col => col.COLUMN_NAME);

      if (!existingProductColumns.includes('hasVariations')) {
          await pool.execute('ALTER TABLE products ADD COLUMN hasVariations BOOLEAN DEFAULT false');
          console.log('✅ Added hasVariations column to products table');
      }

      // Check if new columns exist and add them if they don't
      // userId kolonunun NULL olup olmadığını kontrol et
      const [userIdColumn] = await pool.execute(`
    SELECT IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'userId'
  `);
      
      if (userIdColumn.length > 0 && userIdColumn[0].IS_NULLABLE === 'NO') {
        // userId kolonunu NULL yapılabilir hale getir
        await pool.execute('ALTER TABLE orders MODIFY COLUMN userId INT NULL');
        console.log('✅ Modified userId column to allow NULL for external orders');
      }

      const [columns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME IN ('city', 'district', 'fullAddress', 'updatedAt', 'customerName', 'customerEmail', 'customerPhone', 'paymentStatus', 'paymentId', 'paymentProvider', 'paidAt', 'paymentMeta')
  `);

      const existingColumns = columns.map(col => col.COLUMN_NAME);

      if (!existingColumns.includes('city')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN city VARCHAR(100)');
          console.log('✅ Added city column to orders table');
      }

      if (!existingColumns.includes('district')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN district VARCHAR(100)');
          console.log('✅ Added district column to orders table');
      }

      if (!existingColumns.includes('fullAddress')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN fullAddress TEXT');
          console.log('✅ Added fullAddress column to orders table');
      }

      if (!existingColumns.includes('updatedAt')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
          console.log('✅ Added updatedAt column to orders table');
      }

      if (!existingColumns.includes('customerName')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN customerName VARCHAR(255)');
          console.log('✅ Added customerName column to orders table');
      }

      if (!existingColumns.includes('customerEmail')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN customerEmail VARCHAR(255)');
          console.log('✅ Added customerEmail column to orders table');
      }

      if (!existingColumns.includes('customerPhone')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN customerPhone VARCHAR(50)');
          console.log('✅ Added customerPhone column to orders table');
      }

      if (!existingColumns.includes('paymentStatus')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN paymentStatus ENUM("pending", "completed", "failed", "refunded") DEFAULT "pending"');
          console.log('✅ Added paymentStatus column to orders table');
      }

      if (!existingColumns.includes('paymentId')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN paymentId VARCHAR(255)');
          console.log('✅ Added paymentId column to orders table');
      }

      if (!existingColumns.includes('paymentProvider')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN paymentProvider VARCHAR(50)');
          console.log('✅ Added paymentProvider column to orders table');
      }

      if (!existingColumns.includes('paidAt')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN paidAt TIMESTAMP NULL');
          console.log('✅ Added paidAt column to orders table');
      }

      if (!existingColumns.includes('paymentMeta')) {
          await pool.execute('ALTER TABLE orders ADD COLUMN paymentMeta JSON');
          console.log('✅ Added paymentMeta column to orders table');
      }
      console.log('✅ Orders table ready');

      // Order Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      orderId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      productName VARCHAR(500),
      productDescription TEXT,
      productCategory VARCHAR(255),
      productBrand VARCHAR(255),
      productImage VARCHAR(500),
      variationString VARCHAR(255),
      selectedVariations JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_order_items (tenantId),
      INDEX idx_order_items (orderId),
      INDEX idx_product_order (productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      // productId kolonunun NULL olup olmadığını kontrol et
      const [productIdColumn] = await pool.execute(`
    SELECT IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_items'
    AND COLUMN_NAME = 'productId'
  `);
      
      if (productIdColumn.length > 0 && productIdColumn[0].IS_NULLABLE === 'NO') {
        // productId kolonunu NULL yapılabilir hale getir
        await pool.execute('ALTER TABLE order_items MODIFY COLUMN productId INT NULL');
        console.log('✅ Modified productId column to allow NULL for external order items');
      }

      // Check if new product columns exist in order_items and add them if they don't
      const [orderItemColumns] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_items'
    AND COLUMN_NAME IN ('productName', 'productDescription', 'productCategory', 'productBrand', 'productImage', 'variationString', 'selectedVariations')
  `);

      const existingOrderItemColumns = orderItemColumns.map(col => col.COLUMN_NAME);

      if (!existingOrderItemColumns.includes('productName')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN productName VARCHAR(500)');
          console.log('✅ Added productName column to order_items table');
      }

      if (!existingOrderItemColumns.includes('productDescription')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN productDescription TEXT');
          console.log('✅ Added productDescription column to order_items table');
      }

      if (!existingOrderItemColumns.includes('productCategory')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN productCategory VARCHAR(255)');
          console.log('✅ Added productCategory column to order_items table');
      }
      if (!existingOrderItemColumns.includes('variationString')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN variationString VARCHAR(255)');
          console.log('✅ Added variationString column to order_items table');
      }

      if (!existingOrderItemColumns.includes('selectedVariations')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN selectedVariations JSON');
          console.log('✅ Added selectedVariations column to order_items table');
      }

      if (!existingOrderItemColumns.includes('productBrand')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN productBrand VARCHAR(255)');
          console.log('✅ Added productBrand column to order_items table');
      }

      if (!existingOrderItemColumns.includes('productImage')) {
          await pool.execute('ALTER TABLE order_items ADD COLUMN productImage VARCHAR(500)');
          console.log('✅ Added productImage column to order_items table');
      }

      console.log('✅ Order items table ready');

      // Marketplace Orders table (Trendyol, HepsiBurada vb. için)
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      provider VARCHAR(50) NOT NULL,
      externalOrderId VARCHAR(255) NOT NULL,
      totalAmount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shippingAddress TEXT NOT NULL,
      city VARCHAR(100),
      district VARCHAR(100),
      fullAddress TEXT,
      customerName VARCHAR(255),
      customerEmail VARCHAR(255),
      customerPhone VARCHAR(50),
      cargoSlipPrintedAt TIMESTAMP NULL,
      orderData JSON,
      syncedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY unique_external_order (tenantId, provider, externalOrderId),
      INDEX idx_tenant_marketplace (tenantId),
      INDEX idx_provider (provider),
      INDEX idx_external_order_id (externalOrderId),
      INDEX idx_status_provider (status, provider),
      INDEX idx_synced_at (syncedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Marketplace orders table ready');

      // Marketplace Order Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS marketplace_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      marketplaceOrderId INT NOT NULL,
      productName VARCHAR(500) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      productImage VARCHAR(500),
      productSku VARCHAR(255),
      itemData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (marketplaceOrderId) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      INDEX idx_tenant_marketplace_items (tenantId),
      INDEX idx_marketplace_order (marketplaceOrderId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Marketplace order items table ready');

      // Hepsiburada Orders table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS hepsiburada_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      externalOrderId VARCHAR(255) NOT NULL,
      packageNumber VARCHAR(100),
      totalAmount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shippingAddress TEXT NOT NULL,
      city VARCHAR(100),
      district VARCHAR(100),
      fullAddress TEXT,
      invoiceAddress TEXT,
      customerName VARCHAR(255),
      customerEmail VARCHAR(255),
      customerPhone VARCHAR(50),
      cargoProviderName VARCHAR(100),
      cargoTrackingNumber VARCHAR(100),
      barcode VARCHAR(100),
      orderDate DATETIME,
      deliveryDate VARCHAR(100),
      deliveryType VARCHAR(100),
      packageStatus VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'TRY',
      customerType VARCHAR(50),
      isHepsiLogistic BOOLEAN DEFAULT FALSE,
      isReturned BOOLEAN DEFAULT FALSE,
      cargoSlipPrintedAt TIMESTAMP NULL,
      orderData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY unique_external_order (tenantId, externalOrderId),
      INDEX idx_tenant_hepsiburada (tenantId),
      INDEX idx_external_order_id (externalOrderId),
      INDEX idx_status (status),
      INDEX idx_created_at (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Hepsiburada orders table ready');

      // Hepsiburada Order Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS hepsiburada_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      hepsiburadaOrderId INT NOT NULL,
      itemNumber VARCHAR(50),
      productName VARCHAR(500) NOT NULL,
      productSku VARCHAR(255),
      hepsiburadaProductCode VARCHAR(255),
      option1 VARCHAR(255),
      option2 VARCHAR(255),
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      listingPrice DECIMAL(10,2),
      unitPrice DECIMAL(10,2),
      commission DECIMAL(10,2),
      taxRate DECIMAL(5,2),
      category VARCHAR(255),
      itemData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (hepsiburadaOrderId) REFERENCES hepsiburada_orders(id) ON DELETE CASCADE,
      INDEX idx_tenant_hepsiburada_items (tenantId),
      INDEX idx_hepsiburada_order (hepsiburadaOrderId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Hepsiburada order items table ready');

      // Ticimax Orders table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS ticimax_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      externalOrderId VARCHAR(255) NOT NULL,
      orderNumber VARCHAR(100),
      totalAmount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shippingAddress TEXT NOT NULL,
      city VARCHAR(100),
      district VARCHAR(100),
      fullAddress TEXT,
      invoiceAddress TEXT,
      customerName VARCHAR(255),
      customerEmail VARCHAR(255),
      customerPhone VARCHAR(50),
      cargoProviderName VARCHAR(100),
      cargoTrackingNumber VARCHAR(100),
      barcode VARCHAR(100),
      orderDate DATETIME,
      deliveryDate VARCHAR(100),
      deliveryType VARCHAR(100),
      packageStatus VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'TRY',
      customerType VARCHAR(50),
      orderData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY unique_ticimax_order (tenantId, externalOrderId),
      INDEX idx_tenant_ticimax (tenantId),
      INDEX idx_external_order_id (externalOrderId),
      INDEX idx_status (status),
      INDEX idx_created_at (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Ticimax orders table ready');

      // Ticimax Order Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS ticimax_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      ticimaxOrderId INT NOT NULL,
      itemNumber VARCHAR(50),
      productName VARCHAR(500) NOT NULL,
      productSku VARCHAR(255),
      productCode VARCHAR(255),
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      unitPrice DECIMAL(10,2),
      taxRate DECIMAL(5,2),
      category VARCHAR(255),
      itemData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (ticimaxOrderId) REFERENCES ticimax_orders(id) ON DELETE CASCADE,
      INDEX idx_tenant_ticimax_items (tenantId),
      INDEX idx_ticimax_order (ticimaxOrderId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Ticimax order items table ready');

      // Trendyol Products table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS trendyol_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      integrationId INT,
      -- Trendyol API'den gelen temel alanlar
      trendyolId VARCHAR(255),
      barcode VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      productMainId VARCHAR(255),
      productCode BIGINT,
      productContentId BIGINT,
      platformListingId VARCHAR(255),
      stockId VARCHAR(255),
      -- Marka ve Kategori
      brand VARCHAR(255),
      brandId INT,
      categoryName VARCHAR(255),
      categoryId INT,
      pimCategoryId INT,
      -- Stok ve Fiyat
      quantity INT DEFAULT 0,
      stockCode VARCHAR(255),
      stockUnitType VARCHAR(50) DEFAULT 'Adet',
      listPrice DECIMAL(10,2) DEFAULT 0,
      salePrice DECIMAL(10,2) DEFAULT 0,
      vatRate INT DEFAULT 18,
      dimensionalWeight DECIMAL(10,2),
      -- Durum Bilgileri
      approved BOOLEAN DEFAULT false,
      archived BOOLEAN DEFAULT false,
      onSale BOOLEAN DEFAULT false,
      rejected BOOLEAN DEFAULT false,
      blacklisted BOOLEAN DEFAULT false,
      locked BOOLEAN DEFAULT false,
      hasActiveCampaign BOOLEAN DEFAULT false,
      lockedByUnSuppliedReason BOOLEAN DEFAULT false,
      hasHtmlContent BOOLEAN DEFAULT false,
      -- Diğer Bilgiler
      description TEXT,
      gender VARCHAR(100),
      color VARCHAR(100),
      size VARCHAR(100),
      supplierId INT,
      -- Görseller (JSON array)
      images JSON,
      -- Özellikler (JSON array)
      attributes JSON,
      -- Delivery ve diğer
      deliveryOption JSON,
      locationBasedDelivery VARCHAR(50),
      lotNumber VARCHAR(255),
      productUrl VARCHAR(500),
      -- Batch Request
      batchRequestId VARCHAR(255),
      -- Versiyon
      version INT DEFAULT 1,
      -- Tarihler
      createDateTime BIGINT,
      lastUpdateDate BIGINT,
      syncedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      -- Tam JSON verisi (backup için)
      fullProductData JSON,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY unique_trendyol_product (tenantId, barcode),
      INDEX idx_tenant_trendyol (tenantId),
      INDEX idx_integration (integrationId),
      INDEX idx_barcode (barcode),
      INDEX idx_stock_code (stockCode),
      INDEX idx_product_main_id (productMainId),
      INDEX idx_trendyol_id (trendyolId),
      INDEX idx_approved (approved),
      INDEX idx_on_sale (onSale),
      INDEX idx_archived (archived),
      INDEX idx_rejected (rejected),
      INDEX idx_brand_id (brandId),
      INDEX idx_category_id (categoryId),
      INDEX idx_synced_at (syncedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Trendyol products table ready');

      // Reviews table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      userId INT NOT NULL,
      userName VARCHAR(255) NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_reviews (tenantId),
      INDEX idx_product_reviews (productId),
      INDEX idx_user_reviews (userId),
      INDEX idx_rating_tenant (rating, tenantId),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Reviews table ready');

      // Status sütunu yoksa ekle (backward compatibility)
      try {
        await pool.execute(`
          ALTER TABLE reviews 
          ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'
        `);
        console.log('✅ Reviews status column added/verified');
      } catch (error) {
        // Sütun zaten varsa hata vermez, devam eder
        if (error.code !== 'ER_DUP_FIELDNAME') {
          console.warn('⚠️ Could not add status column to reviews:', error.message);
        }
      }

      // Review Media table (görsel ve video desteği)
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS review_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      reviewId INT NOT NULL,
      mediaType ENUM('image', 'video') NOT NULL,
      mediaUrl VARCHAR(500) NOT NULL,
      thumbnailUrl VARCHAR(500),
      fileSize INT,
      mimeType VARCHAR(100),
      uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      displayOrder INT DEFAULT 0,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE,
      INDEX idx_review_media (reviewId),
      INDEX idx_tenant_media (tenantId),
      INDEX idx_media_type (mediaType)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Review media table ready');

      // User Wallets table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      balance DECIMAL(10,2) DEFAULT 0.00,
      currency VARCHAR(10) DEFAULT 'TRY',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_wallet (tenantId),
      INDEX idx_user_wallet (userId),
      UNIQUE KEY unique_user_wallet_per_tenant (userId, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User wallets table ready');

      // Wallet Transactions table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      type ENUM('credit', 'debit') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
      paymentMethod VARCHAR(100),
      orderId INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
      INDEX idx_tenant_transactions (tenantId),
      INDEX idx_user_transactions (userId),
      INDEX idx_transaction_type (type),
      INDEX idx_transaction_status (status),
      INDEX idx_transaction_date (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Wallet transactions table ready');

      // User Lists table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_lists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_lists (tenantId),
      INDEX idx_user_lists (userId),
      INDEX idx_list_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User lists table ready');

      // User List Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_list_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      listId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT DEFAULT 1,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (listId) REFERENCES user_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_list_items (tenantId),
      INDEX idx_list_items (listId),
      INDEX idx_product_items (productId),
      UNIQUE KEY unique_list_product (listId, productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User list items table ready');

      // User Favorites table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_favorites_v2 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      productId INT NOT NULL,
      productData JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_favorites (tenantId),
      INDEX idx_user_favorites (userId),
      INDEX idx_product_favorites (productId),
      UNIQUE KEY unique_user_product_favorite (userId, productId, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User favorites table ready');

      // Return Requests table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      orderId INT NOT NULL,
      orderItemId INT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
      requestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processedDate TIMESTAMP NULL,
      refundAmount DECIMAL(10,2) NOT NULL,
      adminNotes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (orderItemId) REFERENCES order_items(id) ON DELETE CASCADE,
      INDEX idx_tenant_returns (tenantId),
      INDEX idx_user_returns (userId),
      INDEX idx_order_returns (orderId),
      INDEX idx_return_status (status),
      INDEX idx_return_date (requestDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Return requests table ready');

      // Payment Transactions table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      orderId INT NOT NULL,
      paymentId VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'iyzico',
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
      status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
      transactionData JSON,
      conversationId VARCHAR(255),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_tenant_payments (tenantId),
      INDEX idx_order_payments (orderId),
      INDEX idx_payment_id (paymentId),
      INDEX idx_payment_status (status),
      INDEX idx_payment_date (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Payment transactions table ready');

      // Custom Production Messages table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS custom_production_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      requestId INT NOT NULL,
      userId INT NOT NULL,
      sender ENUM('user','admin') NOT NULL,
      message TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (requestId) REFERENCES custom_production_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_req_messages (requestId, createdAt),
      INDEX idx_sender (sender)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Custom production messages table ready');

      // Custom Production Requests table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS custom_production_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NULL,
      requestNumber VARCHAR(50) NOT NULL,
      status ENUM('pending', 'review', 'design', 'production', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
      totalQuantity INT NOT NULL,
      totalAmount DECIMAL(10,2) DEFAULT 0.00,
      customerName VARCHAR(255) NOT NULL,
      customerEmail VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(50),
      notes TEXT,
      estimatedDeliveryDate DATE,
      actualDeliveryDate DATE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_requests (tenantId),
      INDEX idx_user_requests (userId),
      INDEX idx_request_number (requestNumber),
      INDEX idx_request_status (status),
      INDEX idx_request_date (createdAt),
      UNIQUE KEY unique_request_number_per_tenant (requestNumber, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Custom production requests table ready');

      // Custom Production Items table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS custom_production_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      requestId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      customizations JSON NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (requestId) REFERENCES custom_production_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_tenant_items (tenantId),
      INDEX idx_request_items (requestId),
      INDEX idx_product_items (productId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Custom production items table ready');

      // Customer segments table for personalized campaigns
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_segments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      criteria JSON NOT NULL,
      isActive BOOLEAN DEFAULT true,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_segments (tenantId),
      INDEX idx_active_segments (isActive, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Customer segments table ready');

      // Campaigns table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type ENUM('discount', 'free_shipping', 'bundle', 'loyalty', 'seasonal', 'birthday', 'abandoned_cart') NOT NULL,
      status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
      targetSegmentId INT,
      discountType ENUM('percentage', 'fixed', 'buy_x_get_y') DEFAULT 'percentage',
      discountValue DECIMAL(10,2) DEFAULT 0,
      minOrderAmount DECIMAL(10,2) DEFAULT 0,
      maxDiscountAmount DECIMAL(10,2),
      applicableProducts JSON,
      excludedProducts JSON,
      startDate TIMESTAMP,
      endDate TIMESTAMP,
      usageLimit INT,
      usedCount INT DEFAULT 0,
      isActive BOOLEAN DEFAULT true,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (targetSegmentId) REFERENCES customer_segments(id) ON DELETE SET NULL,
      INDEX idx_tenant_campaigns (tenantId),
      INDEX idx_type_status (type, status),
      INDEX idx_dates (startDate, endDate),
      INDEX idx_target_segment (targetSegmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Campaigns table ready');

      // Customer segment assignments
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_segment_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      segmentId INT NOT NULL,
      assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (segmentId) REFERENCES customer_segments(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_segment (userId, segmentId),
      INDEX idx_tenant_assignments (tenantId),
      INDEX idx_user_assignments (userId),
      INDEX idx_segment_assignments (segmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Customer segment assignments table ready');

      // Campaign usage tracking
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS campaign_usage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      campaignId INT NOT NULL,
      userId INT NOT NULL,
      orderId INT,
      discountAmount DECIMAL(10,2) DEFAULT 0,
      usedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
      INDEX idx_tenant_usage (tenantId),
      INDEX idx_campaign_usage (campaignId),
      INDEX idx_user_usage (userId),
      INDEX idx_usage_date (usedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Campaign usage table ready');

      // Customer behavior analytics
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_analytics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      totalOrders INT DEFAULT 0,
      totalSpent DECIMAL(10,2) DEFAULT 0,
      averageOrderValue DECIMAL(10,2) DEFAULT 0,
      lastOrderDate TIMESTAMP,
      favoriteCategories JSON,
      favoriteBrands JSON,
      purchaseFrequency INT DEFAULT 0,
      customerLifetimeValue DECIMAL(10,2) DEFAULT 0,
      lastActivityDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_analytics (userId, tenantId),
      INDEX idx_tenant_analytics (tenantId),
      INDEX idx_user_analytics (userId),
      INDEX idx_last_activity (lastActivityDate),
      INDEX idx_customer_value (customerLifetimeValue)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Customer analytics table ready');

      // Product recommendations removed



      // Discount wheel system
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS discount_wheel_spins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT,
      deviceId VARCHAR(255) NOT NULL,
      ipAddress VARCHAR(45),
      userAgent TEXT,
      spinResult ENUM('1', '3', '5', '7', '10', '20') NOT NULL,
      discountCode VARCHAR(20) NOT NULL,
      isUsed BOOLEAN DEFAULT false,
      usedAt TIMESTAMP NULL,
      orderId INT NULL,
      expiresAt TIMESTAMP NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
      UNIQUE KEY unique_device_spin (deviceId, tenantId),
      INDEX idx_tenant_spins (tenantId),
      INDEX idx_user_spins (userId),
      INDEX idx_device_spins (deviceId),
      INDEX idx_discount_code (discountCode),
      INDEX idx_expires (expiresAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Discount wheel spins table ready');

      // Chatbot analytics table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS chatbot_analytics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NULL,
      message TEXT,
      intent VARCHAR(100),
      satisfaction TINYINT,
      productId INT NULL,
      productName VARCHAR(255) NULL,
      productPrice DECIMAL(10,2) NULL,
      productImage TEXT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
      INDEX idx_tenant_analytics (tenantId),
      INDEX idx_user_analytics (userId),
      INDEX idx_intent_analytics (intent),
      INDEX idx_product_analytics (productId),
      INDEX idx_timestamp_analytics (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Chatbot analytics table ready');

      // User notifications table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('info', 'success', 'warning', 'error', 'promotion', 'order') DEFAULT 'info',
      isRead BOOLEAN DEFAULT false,
      readAt TIMESTAMP NULL,
      data JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_notifications (tenantId),
      INDEX idx_user_notifications (userId),
      INDEX idx_read_status (isRead),
      INDEX idx_created_at (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User notifications table ready');

      // Update discount_wheel_spins ENUM if needed
      try {
        await pool.execute(`
          ALTER TABLE discount_wheel_spins 
          MODIFY COLUMN spinResult ENUM('1', '3', '5', '7', '10', '20') NOT NULL
        `);
        console.log('✅ Discount wheel spins ENUM updated');
      } catch (error) {
        // Column might already have correct ENUM or table doesn't exist yet
        if (!error.message.includes('Duplicate column') && !error.message.includes("doesn't exist")) {
          console.log('⚠️ Could not update discount_wheel_spins ENUM:', error.message);
        }
      }
      
      // Mevcut tabloya productId kolonlarını ekle (eğer yoksa)
      try {
        // Önce kolonların var olup olmadığını kontrol et
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'chatbot_analytics'
            AND COLUMN_NAME IN ('productId', 'productName', 'productPrice', 'productImage')
        `);
        
        const existingColumns = columns.map((c) => c.COLUMN_NAME);
        
        if (!existingColumns.includes('productId')) {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD COLUMN productId INT NULL`);
        }
        if (!existingColumns.includes('productName')) {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD COLUMN productName VARCHAR(255) NULL`);
        }
        if (!existingColumns.includes('productPrice')) {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD COLUMN productPrice DECIMAL(10,2) NULL`);
        }
        if (!existingColumns.includes('productImage')) {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD COLUMN productImage TEXT NULL`);
        }
        
        // Index ekle (eğer yoksa)
        try {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD INDEX idx_product_analytics (productId)`);
        } catch (idxError) {
          if (!idxError.message.includes('Duplicate key name')) {
            console.warn('⚠️ Index eklenemedi:', idxError.message);
          }
        }
        
        // Foreign key ekle (eğer yoksa)
        try {
          await pool.execute(`ALTER TABLE chatbot_analytics ADD FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL`);
        } catch (fkError) {
          if (!fkError.message.includes('Duplicate foreign key') && !fkError.message.includes('already exists')) {
            console.warn('⚠️ Foreign key eklenemedi:', fkError.message);
          }
        }
      } catch (e) {
        console.warn('⚠️ Chatbot analytics table update warning:', e.message);
      }

      // Wallet recharge requests table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS wallet_recharge_requests (
      id VARCHAR(50) PRIMARY KEY,
      userId INT NOT NULL,
      tenantId INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paymentMethod ENUM('card', 'bank_transfer') NOT NULL,
      bankInfo JSON,
      status ENUM('pending', 'pending_approval', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
      errorMessage TEXT,
      approvedBy INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completedAt TIMESTAMP NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_requests (userId),
      INDEX idx_tenant_requests (tenantId),
      INDEX idx_status_requests (status),
      INDEX idx_created_requests (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Wallet recharge requests table ready');

      // User discount codes
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_discount_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      discountCode VARCHAR(20) NOT NULL,
      discountType ENUM('percentage', 'fixed') NOT NULL,
      discountValue DECIMAL(10,2) NOT NULL,
      minOrderAmount DECIMAL(10,2) DEFAULT 0,
      maxDiscountAmount DECIMAL(10,2),
      isUsed BOOLEAN DEFAULT false,
      usedAt TIMESTAMP NULL,
      orderId INT NULL,
      expiresAt TIMESTAMP NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
      INDEX idx_tenant_codes (tenantId),
      INDEX idx_user_codes (userId),
      INDEX idx_discount_code (discountCode),
      INDEX idx_expires (expiresAt),
      INDEX idx_used (isUsed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User discount codes table ready');

      // Referral earnings table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS referral_earnings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      referrer_id INT NOT NULL,
      referred_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paidAt TIMESTAMP NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tenant_earnings (tenantId),
      INDEX idx_referrer_earnings (referrer_id),
      INDEX idx_referred_earnings (referred_id),
      INDEX idx_status (status),
      INDEX idx_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Referral earnings table ready');

      // ==================== PERSONALIZATION TABLES ====================
      // User events table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      productId INT NULL,
      eventType ENUM('view','click','add_to_cart','purchase','favorite','search','filter') NOT NULL,
      eventValue INT DEFAULT 1,
      searchQuery VARCHAR(255),
      filterDetails JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL,
      INDEX idx_tenant_user_event (tenantId, userId),
      INDEX idx_product_event (productId),
      INDEX idx_event_type (eventType),
      INDEX idx_created_at (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ user_events table ready');

      // User profiles table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      userId INT PRIMARY KEY,
      tenantId INT NOT NULL,
      interests JSON,
      brandPreferences JSON,
      avgPriceMin DECIMAL(10,2),
      avgPriceMax DECIMAL(10,2),
      discountAffinity FLOAT,
      lastActive TIMESTAMP,
      totalEvents INT,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_tenant_profile (userId, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ user_profiles table ready');

      // Categories table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      parentId INT NULL,
      categoryTree TEXT,
      externalId VARCHAR(255),
      source VARCHAR(100) DEFAULT 'XML',
      isActive BOOLEAN DEFAULT true,
      productCount INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL,
      INDEX idx_tenant_categories (tenantId),
      INDEX idx_category_name (name),
      INDEX idx_parent_category (parentId),
      INDEX idx_external_id (externalId),
      INDEX idx_source (source),
      INDEX idx_active (isActive),
      UNIQUE KEY unique_category_per_tenant (name, tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Categories table ready');

      // Recommendations table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      tenantId INT NOT NULL,
      recommendedProducts JSON,
      generatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_user_tenant_rec (userId, tenantId),
      INDEX idx_generated_at (generatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ recommendations table ready');

      // Gift cards table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      fromUserId INT NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      recipientUserId INT NULL,
      amount DECIMAL(10,2) NOT NULL,
      message TEXT,
      status ENUM('active', 'used', 'expired', 'cancelled') DEFAULT 'active',
      tenantId INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expiresAt TIMESTAMP NOT NULL,
      usedAt TIMESTAMP NULL,
      usedBy INT NULL,
      FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (recipientUserId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (usedBy) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_code (code),
      INDEX idx_from_user (fromUserId),
      INDEX idx_tenant (tenantId),
      INDEX idx_recipient_user (recipientUserId),
      INDEX idx_status (status),
      INDEX idx_expires_at (expiresAt),
      INDEX idx_used_by (usedBy)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Gift cards table ready');

      // =========================
      // WAREHOUSE / INVENTORY
      // =========================
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(32),
      address VARCHAR(512),
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY ux_warehouse_tenant_code (tenantId, code),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS warehouse_locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      warehouseId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(32),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_wh_loc (tenantId, warehouseId, code),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS bins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      warehouseId INT NOT NULL,
      locationId INT NULL,
      code VARCHAR(64) NOT NULL,
      capacity INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_bin (tenantId, warehouseId, code),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (locationId) REFERENCES warehouse_locations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      warehouseId INT NOT NULL,
      binId INT NULL,
      quantity INT NOT NULL DEFAULT 0,
      reserved INT NOT NULL DEFAULT 0,
      minLevel INT DEFAULT 0,
      maxLevel INT DEFAULT 0,
      lastCountedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY ux_inventory (tenantId, productId, warehouseId, binId),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (binId) REFERENCES bins(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      fromWarehouseId INT NULL,
      fromBinId INT NULL,
      toWarehouseId INT NULL,
      toBinId INT NULL,
      quantity INT NOT NULL,
      reason ENUM('purchase','sale','transfer','adjustment','production_in','production_out','return') NOT NULL,
      referenceType VARCHAR(50),
      referenceId INT,
      createdBy INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      address VARCHAR(512),
      taxNumber VARCHAR(32),
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      supplierId INT NOT NULL,
      warehouseId INT NOT NULL,
      status ENUM('draft','approved','received','cancelled') DEFAULT 'draft',
      expectedAt DATETIME NULL,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      purchaseOrderId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      receivedQuantity INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      // =========================
      // PRODUCTION
      // =========================
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS bill_of_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      version VARCHAR(32) DEFAULT 'v1',
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS bom_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      bomId INT NOT NULL,
      componentProductId INT NOT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (bomId) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
      FOREIGN KEY (componentProductId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS workstations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(32),
      capacityPerHour INT DEFAULT 0,
      isActive TINYINT(1) DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_ws (tenantId, code),
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productId INT NOT NULL,
      quantity INT NOT NULL,
      status ENUM('planned','in_progress','completed','cancelled') DEFAULT 'planned',
      plannedStart DATETIME NULL,
      plannedEnd DATETIME NULL,
      actualStart DATETIME NULL,
      actualEnd DATETIME NULL,
      warehouseId INT NULL,
      importance_level ENUM('Düşük','Orta','Yüksek','Kritik') DEFAULT 'Orta',
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS production_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productionOrderId INT NOT NULL,
      productId INT NOT NULL,
      requiredQty DECIMAL(12,4) NOT NULL,
      issuedQty DECIMAL(12,4) NOT NULL DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productionOrderId) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS production_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productionOrderId INT NOT NULL,
      workstationId INT NULL,
      stepName VARCHAR(100) NOT NULL,
      sequence INT NOT NULL DEFAULT 1,
      status ENUM('pending','in_progress','done') DEFAULT 'pending',
      startedAt DATETIME NULL,
      finishedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productionOrderId) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (workstationId) REFERENCES workstations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS material_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productionOrderId INT NOT NULL,
      productId INT NOT NULL,
      warehouseId INT NULL,
      binId INT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productionOrderId) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS finished_goods_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      productionOrderId INT NOT NULL,
      productId INT NOT NULL,
      warehouseId INT NULL,
      binId INT NULL,
      quantity INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (productionOrderId) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

      // =========================
      // CRM TABLES
      // =========================
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      title VARCHAR(100),
      status ENUM('new', 'contacted', 'qualified', 'converted', 'lost') DEFAULT 'new',
      source VARCHAR(100),
      value DECIMAL(12,2) DEFAULT 0.00,
      notes TEXT,
      assignedTo INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_leads (tenantId),
      INDEX idx_status (status),
      INDEX idx_source (source),
      INDEX idx_assigned (assignedTo),
      INDEX idx_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM leads table ready');

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      title VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      notes TEXT,
      tags JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_contacts (tenantId),
      INDEX idx_user_contacts (userId),
      INDEX idx_email (email),
      INDEX idx_company (company)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM contacts table ready');

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      probability INT DEFAULT 0,
      sequence INT DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_stages (tenantId),
      INDEX idx_sequence (sequence)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM pipeline stages table ready');

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      contactId INT NULL,
      value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(3) DEFAULT 'TRY',
      stageId INT NULL,
      status ENUM('open', 'won', 'lost') DEFAULT 'open',
      expectedCloseDate DATE,
      description TEXT,
      assignedTo INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (contactId) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      FOREIGN KEY (stageId) REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL,
      FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_deals (tenantId),
      INDEX idx_contact_deals (contactId),
      INDEX idx_stage_deals (stageId),
      INDEX idx_status_deals (status),
      INDEX idx_assigned_deals (assignedTo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM deals (opportunities) table ready');

      // Google Maps Scraped Data Table
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS google_maps_scraped_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      businessName VARCHAR(255) NOT NULL,
      website VARCHAR(500),
      phoneNumber VARCHAR(50),
      searchTerm VARCHAR(255),
      scrapedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_scraped (tenantId),
      INDEX idx_business_name (businessName),
      INDEX idx_phone (phoneNumber),
      INDEX idx_search_term (searchTerm),
      INDEX idx_scraped_at (scrapedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Google Maps scraped data table ready');

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      contactId INT NULL,
      leadId INT NULL,
      opportunityId INT NULL,
      type ENUM('call', 'email', 'meeting', 'note', 'task') NOT NULL DEFAULT 'call',
      title VARCHAR(255) NOT NULL,
      notes TEXT,
      status ENUM('planned', 'completed', 'cancelled') DEFAULT 'planned',
      activityAt DATETIME,
      duration INT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (contactId) REFERENCES crm_contacts(id) ON DELETE SET NULL,
      FOREIGN KEY (leadId) REFERENCES crm_leads(id) ON DELETE SET NULL,
      FOREIGN KEY (opportunityId) REFERENCES crm_deals(id) ON DELETE SET NULL,
      INDEX idx_tenant_activities (tenantId),
      INDEX idx_contact_activities (contactId),
      INDEX idx_lead_activities (leadId),
      INDEX idx_opportunity_activities (opportunityId),
      INDEX idx_type_activities (type),
      INDEX idx_status_activities (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM activities table ready');

      await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      relatedType ENUM('lead', 'opportunity', 'contact', 'other') DEFAULT 'other',
      relatedId INT NULL,
      status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
      priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
      dueDate DATETIME,
      assignedTo INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tenant_tasks (tenantId),
      INDEX idx_status_tasks (status),
      INDEX idx_priority_tasks (priority),
      INDEX idx_due_date_tasks (dueDate),
      INDEX idx_assigned_tasks (assignedTo),
      INDEX idx_related_tasks (relatedType, relatedId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ CRM tasks table ready');

      // =========================
      // CUSTOMER SEGMENTS
      // =========================
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS segments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      criteria TEXT NOT NULL,
      color VARCHAR(100) DEFAULT 'from-blue-500 to-blue-600',
      count INT DEFAULT 0,
      revenue DECIMAL(12,2) DEFAULT 0.00,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_segments (tenantId),
      INDEX idx_name (name),
      INDEX idx_created_at (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Segments table ready');

      // User Segment İlişkisi Tablosu
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_segments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      userId INT NOT NULL,
      segmentId INT NOT NULL,
      assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (segmentId) REFERENCES segments(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_segment (userId, segmentId),
      INDEX idx_tenant_user_segments (tenantId),
      INDEX idx_user_id (userId),
      INDEX idx_segment_id (segmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ User segments table ready');

      // Segment İstatistikleri Tablosu
      await pool.execute(`
    CREATE TABLE IF NOT EXISTS segment_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      segmentId INT NOT NULL,
      statDate DATE NOT NULL,
      totalUsers INT DEFAULT 0,
      totalRevenue DECIMAL(12,2) DEFAULT 0.00,
      avgOrderValue DECIMAL(10,2) DEFAULT 0.00,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (segmentId) REFERENCES segments(id) ON DELETE CASCADE,
      UNIQUE KEY unique_segment_date (segmentId, statDate),
      INDEX idx_tenant_segment_stats (tenantId),
      INDEX idx_segment_id (segmentId),
      INDEX idx_stat_date (statDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
      console.log('✅ Segment stats table ready');

      // Varsayılan segmentleri ekle
      try {
        const [existingSegments] = await pool.execute('SELECT COUNT(*) as count FROM segments WHERE tenantId = 1');
        if (existingSegments[0].count === 0) {
          await pool.execute(`
            INSERT INTO segments (tenantId, name, criteria, color, count, revenue) VALUES
            (1, 'VIP Müşteriler', 'Toplam harcama > 5000 TL', 'from-purple-500 to-purple-600', 45, 125000),
            (1, 'Yeni Müşteriler', 'Son 30 gün içinde kayıt olanlar', 'from-green-500 to-green-600', 120, 45000),
            (1, 'Sadık Müşteriler', '5+ sipariş vermiş müşteriler', 'from-blue-500 to-blue-600', 78, 89000),
            (1, 'Yüksek Harcama', 'Ortalama sipariş tutarı > 1000 TL', 'from-orange-500 to-orange-600', 32, 156000)
          `);
          console.log('✅ Default segments inserted');
        }
      } catch (error) {
        console.log('⚠️ Could not insert default segments:', error.message);
      }

      // Segment istatistiklerini güncellemek için trigger'lar
      try {
        await pool.execute(`
          CREATE TRIGGER IF NOT EXISTS update_segment_stats_after_user_assignment
              AFTER INSERT ON user_segments
              FOR EACH ROW
          BEGIN
              UPDATE segments 
              SET count = (
                  SELECT COUNT(*) 
                  FROM user_segments 
                  WHERE segmentId = NEW.segmentId AND tenantId = NEW.tenantId
              )
              WHERE id = NEW.segmentId AND tenantId = NEW.tenantId;
          END
        `);
        console.log('✅ Segment assignment trigger created');

        await pool.execute(`
          CREATE TRIGGER IF NOT EXISTS update_segment_stats_after_user_removal
              AFTER DELETE ON user_segments
              FOR EACH ROW
          BEGIN
              UPDATE segments 
              SET count = (
                  SELECT COUNT(*) 
                  FROM user_segments 
                  WHERE segmentId = OLD.segmentId AND tenantId = OLD.tenantId
              )
              WHERE id = OLD.segmentId AND tenantId = OLD.tenantId;
          END
        `);
        console.log('✅ Segment removal trigger created');
      } catch (error) {
        console.log('⚠️ Could not create segment triggers:', error.message);
      }

      // Stories table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS stories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          imageUrl VARCHAR(500) NOT NULL,
          thumbnailUrl VARCHAR(500),
          videoUrl VARCHAR(500),
          isActive BOOLEAN DEFAULT true,
          \`order\` INT DEFAULT 1,
          expiresAt TIMESTAMP NULL,
          clickAction JSON,
          views INT DEFAULT 0,
          clicks INT DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_order (isActive, \`order\`),
          INDEX idx_expires (expiresAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Stories table ready');

      // Sliders table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS sliders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          imageUrl VARCHAR(500) NOT NULL,
          thumbnailUrl VARCHAR(500),
          videoUrl VARCHAR(500),
          isActive BOOLEAN DEFAULT true,
          \`order\` INT DEFAULT 1,
          autoPlay BOOLEAN DEFAULT true,
          duration INT DEFAULT 5,
          clickAction JSON,
          buttonText VARCHAR(100) DEFAULT 'Keşfet',
          buttonColor VARCHAR(20) DEFAULT '#3B82F6',
          textColor VARCHAR(20) DEFAULT '#FFFFFF',
          overlayOpacity DECIMAL(3,2) DEFAULT 0.3,
          views INT DEFAULT 0,
          clicks INT DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_order (isActive, \`order\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Sliders table ready');

      // Popups table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS popups (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          imageUrl VARCHAR(500),
          type ENUM('modal', 'banner', 'toast', 'slide-in') DEFAULT 'modal',
          position ENUM('center', 'top', 'bottom', 'top-right', 'bottom-right') DEFAULT 'center',
          isActive BOOLEAN DEFAULT true,
          isDismissible BOOLEAN DEFAULT true,
          isRequired BOOLEAN DEFAULT false,
          priority INT DEFAULT 1,
          startDate TIMESTAMP NULL,
          endDate TIMESTAMP NULL,
          targetAudience JSON,
          clickAction JSON,
          buttonText VARCHAR(100),
          buttonColor VARCHAR(20) DEFAULT '#3B82F6',
          backgroundColor VARCHAR(20),
          textColor VARCHAR(20) DEFAULT '#000000',
          width VARCHAR(50) DEFAULT '500px',
          height VARCHAR(50),
          autoClose INT DEFAULT 0,
          showDelay INT DEFAULT 0,
          views INT DEFAULT 0,
          clicks INT DEFAULT 0,
          dismissals INT DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_priority (isActive, priority),
          INDEX idx_dates (startDate, endDate)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Popups table ready');

      // Anonymous devices table - Oturum açmamış kullanıcıların device bilgileri
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anonymous_devices (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          deviceId VARCHAR(255) UNIQUE NOT NULL,
          platform VARCHAR(50),
          osVersion VARCHAR(100),
          screenSize VARCHAR(50),
          browser VARCHAR(100),
          firstSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          totalSessions INT DEFAULT 0,
          metadata JSON,
          INDEX idx_deviceId (deviceId),
          INDEX idx_lastSeen (lastSeen),
          INDEX idx_platform (platform)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ anonymous_devices table ready');

      // User behavior events table - Tüm behavior eventleri (hem logged-in hem anonymous)
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_behavior_events (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          userId INT NULL,
          userName VARCHAR(255) NULL,
          deviceId VARCHAR(255) NOT NULL,
          eventType VARCHAR(100) NOT NULL,
          screenName VARCHAR(255),
          eventData JSON,
          sessionId VARCHAR(255) NOT NULL,
          timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          ipAddress VARCHAR(45),
          userAgent VARCHAR(500),
          performanceMetrics JSON,
          characteristics JSON,
          -- eventData'dan parse edilen kolonlar
          timeOnScreen INT NULL COMMENT 'Ekranda geçirilen süre (saniye)',
          action VARCHAR(100) NULL COMMENT 'Yapılan aksiyon',
          responseTime INT NULL COMMENT 'Yanıt süresi (ms)',
          productId INT NULL COMMENT 'Ürün ID (product_view, add_to_cart, purchase için)',
          searchQuery VARCHAR(500) NULL COMMENT 'Arama sorgusu',
          errorMessage TEXT NULL COMMENT 'Hata mesajı (error_event için)',
          scrollDepth DECIMAL(5,2) NULL COMMENT 'Scroll derinliği (0-100)',
          clickElement VARCHAR(255) NULL COMMENT 'Tıklanan element (button_click için)',
          orderId INT NULL COMMENT 'Sipariş ID (purchase için)',
          amount DECIMAL(10,2) NULL COMMENT 'Tutar (purchase için)',
          INDEX idx_userId (userId),
          INDEX idx_userName (userName),
          INDEX idx_deviceId (deviceId),
          INDEX idx_eventType (eventType),
          INDEX idx_timestamp (timestamp),
          INDEX idx_sessionId (sessionId),
          INDEX idx_user_device (userId, deviceId),
          INDEX idx_event_timestamp (eventType, timestamp),
          INDEX idx_device_timestamp (deviceId, timestamp),
          INDEX idx_productId (productId),
          INDEX idx_orderId (orderId),
          INDEX idx_user_session (userId, sessionId),
          INDEX idx_device_session (deviceId, sessionId),
          INDEX idx_screen_event (screenName, eventType),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ user_behavior_events table ready');
      
      // Yeni kolonları ekle (eğer tablo zaten varsa)
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_behavior_events'
        `);
        const existingColumns = columns.map((c) => c.COLUMN_NAME);
        
        const newColumns = [
          { name: 'userName', sql: 'ADD COLUMN userName VARCHAR(255) NULL AFTER userId' },
          { name: 'timeOnScreen', sql: 'ADD COLUMN timeOnScreen INT NULL COMMENT \'Ekranda geçirilen süre (saniye)\' AFTER characteristics' },
          { name: 'action', sql: 'ADD COLUMN action VARCHAR(100) NULL COMMENT \'Yapılan aksiyon\' AFTER timeOnScreen' },
          { name: 'responseTime', sql: 'ADD COLUMN responseTime INT NULL COMMENT \'Yanıt süresi (ms)\' AFTER action' },
          { name: 'productId', sql: 'ADD COLUMN productId INT NULL COMMENT \'Ürün ID\' AFTER responseTime' },
          { name: 'searchQuery', sql: 'ADD COLUMN searchQuery VARCHAR(500) NULL COMMENT \'Arama sorgusu\' AFTER productId' },
          { name: 'errorMessage', sql: 'ADD COLUMN errorMessage TEXT NULL COMMENT \'Hata mesajı\' AFTER searchQuery' },
          { name: 'scrollDepth', sql: 'ADD COLUMN scrollDepth DECIMAL(5,2) NULL COMMENT \'Scroll derinliği\' AFTER errorMessage' },
          { name: 'clickElement', sql: 'ADD COLUMN clickElement VARCHAR(255) NULL COMMENT \'Tıklanan element\' AFTER scrollDepth' },
          { name: 'orderId', sql: 'ADD COLUMN orderId INT NULL COMMENT \'Sipariş ID\' AFTER clickElement' },
          { name: 'amount', sql: 'ADD COLUMN amount DECIMAL(10,2) NULL COMMENT \'Tutar\' AFTER orderId' }
        ];
        
        for (const col of newColumns) {
          if (!existingColumns.includes(col.name)) {
            await pool.execute(`ALTER TABLE user_behavior_events ${col.sql}`);
            console.log(`✅ Added ${col.name} column to user_behavior_events`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Error adding columns to user_behavior_events:', e.message);
      }
      
      // Index'leri ekle
      try {
        const [indexes] = await pool.execute(`
          SELECT INDEX_NAME 
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_behavior_events'
        `);
        const existingIndexes = indexes.map((i) => i.INDEX_NAME);
        
        const newIndexes = [
          { name: 'idx_userName', sql: 'ADD INDEX idx_userName (userName)' },
          { name: 'idx_productId', sql: 'ADD INDEX idx_productId (productId)' },
          { name: 'idx_orderId', sql: 'ADD INDEX idx_orderId (orderId)' },
          { name: 'idx_user_session', sql: 'ADD INDEX idx_user_session (userId, sessionId)' },
          { name: 'idx_device_session', sql: 'ADD INDEX idx_device_session (deviceId, sessionId)' },
          { name: 'idx_screen_event', sql: 'ADD INDEX idx_screen_event (screenName, eventType)' }
        ];
        
        for (const idx of newIndexes) {
          if (!existingIndexes.includes(idx.name)) {
            await pool.execute(`ALTER TABLE user_behavior_events ${idx.sql}`);
            console.log(`✅ Added ${idx.name} index to user_behavior_events`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Error adding indexes to user_behavior_events:', e.message);
      }
      
      // timestamp kolonunu DATETIME(3) yap (mikrosaniye hassasiyeti için)
      try {
        await pool.execute(`ALTER TABLE user_behavior_events 
          MODIFY COLUMN timestamp DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)`);
      } catch (e) {
        // Zaten doğru tip ise hata verme
        console.warn('⚠️ Error modifying timestamp column:', e.message);
      }
      
      // sessionId'yi NOT NULL yap
      try {
        await pool.execute(`ALTER TABLE user_behavior_events 
          MODIFY COLUMN sessionId VARCHAR(255) NOT NULL`);
      } catch (e) {
        // Zaten NOT NULL ise hata verme
        console.warn('⚠️ Error modifying sessionId column:', e.message);
      }

      // Check and add new columns if they don't exist
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_behavior_events'
            AND COLUMN_NAME IN ('performanceMetrics', 'characteristics')
        `);
        const existingColumns = columns.map((c) => c.COLUMN_NAME);
        
        if (!existingColumns.includes('performanceMetrics')) {
          await pool.execute(`
            ALTER TABLE user_behavior_events 
            ADD COLUMN performanceMetrics JSON AFTER eventData
          `);
          console.log('✅ Added performanceMetrics column to user_behavior_events');
        }
        
        if (!existingColumns.includes('characteristics')) {
          await pool.execute(`
            ALTER TABLE user_behavior_events 
            ADD COLUMN characteristics JSON AFTER performanceMetrics
          `);
          console.log('✅ Added characteristics column to user_behavior_events');
        }
      } catch (error) {
        console.warn('⚠️ Could not add columns to user_behavior_events:', error.message);
      }

      // User sessions table - Kullanıcı oturumları (hem logged-in hem anonymous)
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          userId INT NULL,
          deviceId VARCHAR(255) NOT NULL,
          sessionId VARCHAR(255) UNIQUE NOT NULL,
          startTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          endTime TIMESTAMP NULL,
          duration INT DEFAULT 0,
          pageCount INT DEFAULT 0,
          scrollDepth DECIMAL(5,2) DEFAULT 0,
          errorCount INT DEFAULT 0,
          avgPageLoadTime INT DEFAULT 0,
          metadata JSON,
          INDEX idx_userId (userId),
          INDEX idx_deviceId (deviceId),
          INDEX idx_sessionId (sessionId),
          INDEX idx_startTime (startTime),
          INDEX idx_user_device (userId, deviceId),
          INDEX idx_start_time_range (startTime, endTime),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ user_sessions table ready');

      // Check and add new columns if they don't exist
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_sessions'
            AND COLUMN_NAME IN ('errorCount', 'avgPageLoadTime')
        `);
        const existingColumns = columns.map((c) => c.COLUMN_NAME);
        
        if (!existingColumns.includes('errorCount')) {
          await pool.execute(`
            ALTER TABLE user_sessions 
            ADD COLUMN errorCount INT DEFAULT 0 AFTER scrollDepth
          `);
          console.log('✅ Added errorCount column to user_sessions');
        }
        
        if (!existingColumns.includes('avgPageLoadTime')) {
          await pool.execute(`
            ALTER TABLE user_sessions 
            ADD COLUMN avgPageLoadTime INT DEFAULT 0 AFTER errorCount
          `);
          console.log('✅ Added avgPageLoadTime column to user_sessions');
        }
      } catch (error) {
        console.warn('⚠️ Could not add columns to user_sessions:', error.message);
      }

      // Device analytics aggregates table - Periyodik olarak hesaplanan aggregate veriler
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS device_analytics_aggregates (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          deviceId VARCHAR(255) NOT NULL,
          userId INT NULL,
          date DATE NOT NULL,
          screenViews JSON,
          scrollDepth JSON,
          navigationPaths JSON,
          productInteractions JSON,
          cartBehavior JSON,
          paymentBehavior JSON,
          sessions JSON,
          deviceInfo JSON,
          lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_device_date (deviceId, date),
          INDEX idx_userId (userId),
          INDEX idx_deviceId (deviceId),
          INDEX idx_date (date),
          INDEX idx_user_device_date (userId, deviceId, date),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ device_analytics_aggregates table ready');

      // Analytics aggregates table - Günlük/haftalık özet veriler
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS analytics_aggregates (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          tenantId INT NOT NULL,
          aggregateDate DATE NOT NULL,
          aggregateType ENUM('daily', 'weekly', 'monthly') NOT NULL,
          totalUsers INT DEFAULT 0,
          activeUsers INT DEFAULT 0,
          totalSessions INT DEFAULT 0,
          totalEvents INT DEFAULT 0,
          totalRevenue DECIMAL(10,2) DEFAULT 0,
          avgSessionDuration INT DEFAULT 0,
          bounceRate DECIMAL(5,2) DEFAULT 0,
          dau INT DEFAULT 0,
          wau INT DEFAULT 0,
          mau INT DEFAULT 0,
          newUsers INT DEFAULT 0,
          returningUsers INT DEFAULT 0,
          retentionRate DECIMAL(5,2) DEFAULT 0,
          churnRate INT DEFAULT 0,
          productViews INT DEFAULT 0,
          addToCart INT DEFAULT 0,
          checkout INT DEFAULT 0,
          purchase INT DEFAULT 0,
          avgPageLoadTime INT DEFAULT 0,
          errorRate DECIMAL(5,2) DEFAULT 0,
          crashRate INT DEFAULT 0,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_tenant_date_type (tenantId, aggregateDate, aggregateType),
          INDEX idx_tenant (tenantId),
          INDEX idx_date (aggregateDate),
          INDEX idx_type (aggregateType),
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ analytics_aggregates table ready');

      // ML Predictions table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_predictions (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          userId INT NULL,
          tenantId INT NOT NULL DEFAULT 1,
          predictionType ENUM('purchase', 'churn', 'session_duration', 'engagement') NOT NULL,
          probability DECIMAL(5,4) NOT NULL,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_userId (userId),
          INDEX idx_tenantId (tenantId),
          INDEX idx_predictionType (predictionType),
          INDEX idx_createdAt (createdAt),
          INDEX idx_user_tenant (userId, tenantId),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_predictions table ready');

      // ML Recommendations table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_recommendations (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          tenantId INT NOT NULL DEFAULT 1,
          productIds TEXT NOT NULL,
          scores TEXT NOT NULL,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_userId (userId),
          INDEX idx_tenantId (tenantId),
          INDEX idx_createdAt (createdAt),
          UNIQUE KEY unique_user_tenant (userId, tenantId),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_recommendations table ready');

      // ML Anomalies table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_anomalies (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          eventId BIGINT NULL,
          userId INT NULL,
          tenantId INT NOT NULL DEFAULT 1,
          anomalyScore DECIMAL(5,4) NOT NULL,
          anomalyType ENUM('bot', 'fraud', 'unusual_behavior', 'performance_issue') NOT NULL,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_eventId (eventId),
          INDEX idx_userId (userId),
          INDEX idx_tenantId (tenantId),
          INDEX idx_anomalyType (anomalyType),
          INDEX idx_anomalyScore (anomalyScore),
          INDEX idx_createdAt (createdAt),
          FOREIGN KEY (eventId) REFERENCES user_behavior_events(id) ON DELETE SET NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_anomalies table ready');

      // ML Segments table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_segments (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          tenantId INT NOT NULL DEFAULT 1,
          segmentId INT NOT NULL,
          segmentName VARCHAR(255) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_userId (userId),
          INDEX idx_tenantId (tenantId),
          INDEX idx_segmentId (segmentId),
          INDEX idx_segmentName (segmentName),
          INDEX idx_updatedAt (updatedAt),
          UNIQUE KEY unique_user_tenant (userId, tenantId),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_segments table ready');

      // ML Models table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_models (
          id INT AUTO_INCREMENT PRIMARY KEY,
          modelName VARCHAR(255) NOT NULL,
          modelType ENUM('purchase_prediction', 'recommendation', 'anomaly_detection', 'segmentation') NOT NULL,
          version VARCHAR(50) NOT NULL,
          status ENUM('training', 'active', 'inactive', 'archived') DEFAULT 'training',
          filePath VARCHAR(500),
          accuracy DECIMAL(5,4),
          \`precision\` DECIMAL(5,4),
          recall DECIMAL(5,4),
          f1Score DECIMAL(5,4),
          trainingDataSize INT,
          trainingDuration INT,
          hyperparameters JSON,
          metadata JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deployedAt TIMESTAMP NULL,
          INDEX idx_modelType (modelType),
          INDEX idx_status (status),
          INDEX idx_version (version),
          UNIQUE KEY unique_model_version (modelName, version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_models table ready');

      // ML Training Logs table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ml_training_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          modelId INT NOT NULL,
          epoch INT NOT NULL,
          loss DECIMAL(10,6),
          accuracy DECIMAL(5,4),
          validationLoss DECIMAL(10,6),
          validationAccuracy DECIMAL(5,4),
          learningRate DECIMAL(10,8),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_modelId (modelId),
          INDEX idx_epoch (epoch),
          INDEX idx_timestamp (timestamp),
          FOREIGN KEY (modelId) REFERENCES ml_models(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ ml_training_logs table ready');

      // Chat Sessions table
      await pool.execute(`
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
      console.log('✅ chat_sessions table ready');

      // Chat Messages table
      await pool.execute(`
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
      console.log('✅ chat_messages table ready');

      // Integrations table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS integrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenantId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          type ENUM('payment', 'shipping', 'sms', 'email', 'api', 'webhook', 'marketplace', 'other') NOT NULL DEFAULT 'api',
          provider VARCHAR(255) NOT NULL,
          status ENUM('active', 'inactive', 'error') NOT NULL DEFAULT 'inactive',
          apiKey VARCHAR(500),
          apiSecret VARCHAR(500),
          webhookUrl VARCHAR(500),
          config JSON,
          lastTest TIMESTAMP NULL,
          testResult ENUM('success', 'error') NULL,
          description TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          INDEX idx_tenant (tenantId),
          INDEX idx_type (type),
          INDEX idx_provider (provider),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ integrations table ready');

      // Invoices table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenantId INT NOT NULL,
          invoiceNumber VARCHAR(100) NOT NULL,
          customerName VARCHAR(255),
          customerEmail VARCHAR(255),
          customerPhone VARCHAR(50),
          orderId INT NULL,
          amount DECIMAL(10,2) NOT NULL,
          taxAmount DECIMAL(10,2) DEFAULT 0,
          totalAmount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'TRY',
          invoiceDate DATE NOT NULL,
          dueDate DATE,
          status ENUM('draft', 'sent', 'paid', 'cancelled') DEFAULT 'draft',
          filePath VARCHAR(500),
          fileName VARCHAR(255),
          fileSize INT,
          shareToken VARCHAR(100) UNIQUE,
          shareUrl VARCHAR(500),
          notes TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
          INDEX idx_tenant (tenantId),
          INDEX idx_invoice_number (invoiceNumber),
          INDEX idx_customer_email (customerEmail),
          INDEX idx_order (orderId),
          INDEX idx_status (status),
          INDEX idx_share_token (shareToken),
          INDEX idx_invoice_date (invoiceDate)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ invoices table ready');

      // Archive table for old events
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_behavior_events_archive (
          id BIGINT PRIMARY KEY,
          userId INT NULL,
          deviceId VARCHAR(255) NOT NULL,
          eventType VARCHAR(100) NOT NULL,
          screenName VARCHAR(255),
          eventData JSON,
          sessionId VARCHAR(255),
          timestamp TIMESTAMP,
          ipAddress VARCHAR(45),
          userAgent VARCHAR(500),
          archivedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_deviceId (deviceId),
          INDEX idx_timestamp (timestamp),
          INDEX idx_archivedAt (archivedAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ user_behavior_events_archive table ready');

      // Migration: Add importance_level to production_orders if not exists
      try {
        const [columns] = await pool.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'production_orders' AND COLUMN_NAME = 'importance_level'
        `);
        
        if (columns.length === 0) {
          console.log('🔧 Adding importance_level column to production_orders...');
          await pool.execute(`
            ALTER TABLE production_orders 
            ADD COLUMN importance_level ENUM('Düşük','Orta','Yüksek','Kritik') DEFAULT 'Orta' 
            AFTER warehouseId
          `);
          console.log('✅ importance_level column added to production_orders');
        } else {
          console.log('✅ importance_level column already exists in production_orders');
        }
      } catch (error) {
        console.log('⚠️ Could not add importance_level column (may already exist):', error.message);
      }

      // Re-enable foreign key checks
      await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

      console.log('🎉 Database schema updated successfully!');
      return true;

  } catch (error) {
      console.error('❌ Error creating database schema:', error);
      throw error;
  }
}

// poolWrapper will be set by server.js after initialization
let poolWrapperInstance = null;

function setPoolWrapper(pool) {
  poolWrapperInstance = pool;
}

// Getter function for poolWrapper - lazy loading
function getPoolWrapper() {
  if (!poolWrapperInstance) {
    // Try to get from global if available (for cases where it's set in server.js)
    if (typeof global !== 'undefined' && global.poolWrapper) {
      poolWrapperInstance = global.poolWrapper;
      return poolWrapperInstance;
    }
    // Return a proxy that will throw error only when actually used
    return new Proxy({}, {
      get(target, prop) {
        if (!poolWrapperInstance) {
          if (typeof global !== 'undefined' && global.poolWrapper) {
            poolWrapperInstance = global.poolWrapper;
            return poolWrapperInstance[prop];
          }
          throw new Error('poolWrapper not initialized. Call setPoolWrapper first.');
        }
        return poolWrapperInstance[prop];
      }
    });
  }
  return poolWrapperInstance;
}

module.exports = {
  createDatabaseSchema,
  get poolWrapper() {
    return getPoolWrapper();
  },
  getPoolWrapper,
  setPoolWrapper
};
