const { poolWrapper } = require('../database-schema');

class CharacteristicService {
  constructor() {
    this.pool = poolWrapper;
  }

  /**
   * Kullanıcı karakteristiklerini hesapla ve kaydet
   */
  async calculateAndSaveUserCharacteristics(userId, tenantId) {
    try {
      const characteristics = await this.calculateCharacteristics(userId, tenantId);
      
      // Veritabanına kaydet veya güncelle
      try {
        await this.saveCharacteristics(userId, tenantId, characteristics);
      } catch (saveError) {
        console.warn('⚠️ Error saving characteristics, but returning calculated values:', saveError);
        // Kaydetme hatası olsa bile hesaplanan değerleri döndür
      }
      
      return characteristics;
    } catch (error) {
      console.error('❌ Error calculating user characteristics:', error);
      // Hesaplama hatası durumunda default değerler döndür
      return this.getDefaultCharacteristics();
    }
  }

  /**
   * Kullanıcı karakteristiklerini hesapla
   */
  async calculateCharacteristics(userId, tenantId) {
    try {
      const [
        preferences,
        shoppingStyle,
        priceSensitivity,
        brandLoyalty,
        techAdoption,
        engagementLevel,
        activeHours,
        preferredCategories,
        preferredPriceRange,
        socialBehavior,
        decisionSpeed
      ] = await Promise.all([
        this.getPreferences(userId, tenantId),
        this.getShoppingStyle(userId, tenantId),
        this.getPriceSensitivity(userId, tenantId),
        this.getBrandLoyalty(userId, tenantId),
        this.getTechAdoption(userId, tenantId),
        this.getEngagementLevel(userId, tenantId),
        this.getActiveHours(userId, tenantId),
        this.getPreferredCategories(userId, tenantId),
        this.getPreferredPriceRange(userId, tenantId),
        this.getSocialBehavior(userId, tenantId),
        this.getDecisionSpeed(userId, tenantId)
      ]);

      return {
        preferences,
        shoppingStyle,
        priceSensitivityScore: priceSensitivity,
        brandLoyaltyIndex: brandLoyalty,
        technologyAdoptionScore: techAdoption,
        engagementLevel,
        activeHours,
        preferredCategories,
        preferredPriceRange,
        socialBehaviorScore: socialBehavior,
        decisionSpeed
      };
    } catch (error) {
      console.error('❌ Error calculating characteristics:', error);
      throw error;
    }
  }

  /**
   * Tercihleri hesapla (renk, stil, kategori)
   */
  async getPreferences(userId, tenantId) {
    try {
      // Ürün görüntülemelerinden tercihleri çıkar
      const [viewedProducts] = await this.pool.execute(`
        SELECT 
          p.category,
          p.brand,
          JSON_EXTRACT(ube.eventData, '$.color') as color,
          JSON_EXTRACT(ube.eventData, '$.style') as style
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        WHERE ube.userId = ? 
          AND ube.tenantId = ?
          AND ube.eventType = 'product_view'
          AND p.tenantId = ?
        ORDER BY ube.timestamp DESC
        LIMIT 100
      `, [userId, tenantId, tenantId]);

      const categories = {};
      const brands = {};
      const colors = {};
      const styles = {};

      viewedProducts.forEach(product => {
        if (product.category) {
          categories[product.category] = (categories[product.category] || 0) + 1;
        }
        if (product.brand) {
          brands[product.brand] = (brands[product.brand] || 0) + 1;
        }
        if (product.color) {
          colors[product.color] = (colors[product.color] || 0) + 1;
        }
        if (product.style) {
          styles[product.style] = (styles[product.style] || 0) + 1;
        }
      });

      // En çok tercih edilenleri al
      const topCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topBrands = Object.entries(brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topColors = Object.entries(colors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topStyles = Object.entries(styles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        categories: topCategories,
        brands: topBrands,
        colors: topColors,
        styles: topStyles
      };
    } catch (error) {
      console.error('❌ Error getting preferences:', error);
      return { categories: [], brands: [], colors: [], styles: [] };
    }
  }

  /**
   * Alışveriş tarzını belirle
   */
  async getShoppingStyle(userId, tenantId) {
    try {
      // Sepete ekleme öncesi görüntüleme sayısı
      const [viewBeforeCart] = await this.pool.execute(`
        SELECT AVG(views) as avgViews
        FROM (
          SELECT 
            JSON_EXTRACT(ube.eventData, '$.productId') as productId,
            COUNT(*) as views
          FROM user_behavior_events ube
          WHERE ube.userId = ? 
            AND ube.tenantId = ?
            AND ube.eventType IN ('product_view', 'add_to_cart')
          GROUP BY JSON_EXTRACT(ube.eventData, '$.productId')
          HAVING SUM(CASE WHEN ube.eventType = 'add_to_cart' THEN 1 ELSE 0 END) > 0
        ) as productViews
      `, [userId, tenantId]);

      const avgViews = viewBeforeCart[0]?.avgViews || 0;

      // Karar verme süresi
      const [decisionTime] = await this.pool.execute(`
        SELECT AVG(TIMESTAMPDIFF(SECOND, viewTime, cartTime)) as avgTime
        FROM (
          SELECT 
            JSON_EXTRACT(v.eventData, '$.productId') as productId,
            MIN(v.timestamp) as viewTime,
            MIN(c.timestamp) as cartTime
          FROM user_behavior_events v
          JOIN user_behavior_events c ON 
            JSON_EXTRACT(v.eventData, '$.productId') = JSON_EXTRACT(c.eventData, '$.productId')
            AND v.userId = c.userId
          WHERE v.userId = ? 
            AND v.tenantId = ?
            AND v.eventType = 'product_view'
            AND c.eventType = 'add_to_cart'
            AND c.timestamp > v.timestamp
          GROUP BY JSON_EXTRACT(v.eventData, '$.productId')
        ) as decisionTimes
      `, [userId, tenantId]);

      const avgDecisionTime = decisionTime[0]?.avgTime || 0;

      // Alışveriş tarzını belirle
      if (avgViews <= 2 && avgDecisionTime < 60) {
        return 'impulsif'; // Hızlı karar, az görüntüleme
      } else if (avgViews > 5 && avgDecisionTime > 300) {
        return 'karşılaştırmalı'; // Çok görüntüleme, uzun karar süresi
      } else {
        return 'planlı'; // Orta seviye
      }
    } catch (error) {
      console.error('❌ Error getting shopping style:', error);
      return 'planlı';
    }
  }

  /**
   * Fiyat hassasiyet skoru (0-100)
   */
  async getPriceSensitivity(userId, tenantId) {
    try {
      // İndirim kodları kullanımı
      const [discountUsage] = await this.pool.execute(`
        SELECT COUNT(*) as count
        FROM orders o
        WHERE o.userId = ? 
          AND o.tenantId = ?
          AND o.paymentStatus = 'completed'
          AND EXISTS (
            SELECT 1 FROM user_discount_codes udc 
            WHERE udc.userId = ? 
              AND udc.orderId = o.id
          )
      `, [userId, tenantId, userId]);

      // Fiyat takibi yapılan ürünler
      const [priceTracking] = await this.pool.execute(`
        SELECT COUNT(DISTINCT JSON_EXTRACT(eventData, '$.productId')) as count
        FROM user_behavior_events
        WHERE userId = ? 
          AND tenantId = ?
          AND eventType = 'price_track'
      `, [userId, tenantId]);

      // Görüntülenen ürünlerin ortalama fiyatı
      const [avgPrice] = await this.pool.execute(`
        SELECT AVG(p.price) as avgPrice
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        WHERE ube.userId = ? 
          AND ube.tenantId = ?
          AND ube.eventType = 'product_view'
          AND p.tenantId = ?
      `, [userId, tenantId, tenantId]);

      const discountCount = discountUsage[0]?.count || 0;
      const trackingCount = priceTracking[0]?.count || 0;
      const avgProductPrice = avgPrice[0]?.avgPrice || 0;

      // Skor hesaplama (0-100, yüksek = hassas)
      let score = 0;
      if (discountCount > 0) score += 30;
      if (trackingCount > 0) score += 30;
      if (avgProductPrice < 100) score += 20; // Düşük fiyatlı ürünlere bakıyor
      if (discountCount > 3) score += 20; // Çok indirim kodu kullanmış

      return Math.min(score, 100);
    } catch (error) {
      console.error('❌ Error getting price sensitivity:', error);
      return 0;
    }
  }

  /**
   * Marka sadakat indeksi (0-100)
   */
  async getBrandLoyalty(userId, tenantId) {
    try {
      const [brandData] = await this.pool.execute(`
        SELECT 
          p.brand,
          COUNT(DISTINCT o.id) as orderCount
        FROM orders o
        JOIN order_items oi ON o.id = oi.orderId
        JOIN products p ON oi.productId = p.id
        WHERE o.userId = ? 
          AND o.tenantId = ?
          AND o.paymentStatus = 'completed'
          AND p.brand IS NOT NULL
        GROUP BY p.brand
        ORDER BY orderCount DESC
      `, [userId, tenantId]);

      if (brandData.length === 0) return 0;

      const totalOrders = brandData.reduce((sum, b) => sum + b.orderCount, 0);
      const topBrandOrders = brandData[0]?.orderCount || 0;

      // En çok alışveriş yapılan markanın toplam içindeki oranı
      const loyaltyIndex = (topBrandOrders / totalOrders) * 100;
      return Math.round(loyaltyIndex);
    } catch (error) {
      console.error('❌ Error getting brand loyalty:', error);
      return 0;
    }
  }

  /**
   * Teknoloji kullanım seviyesi (0-100)
   */
  async getTechAdoption(userId, tenantId) {
    try {
      // Gelişmiş özellik kullanımı
      const [features] = await this.pool.execute(`
        SELECT 
          SUM(CASE WHEN eventType = 'filter_used' THEN 1 ELSE 0 END) as filters,
          SUM(CASE WHEN eventType = 'sort_used' THEN 1 ELSE 0 END) as sorts,
          SUM(CASE WHEN eventType = 'compare_used' THEN 1 ELSE 0 END) as compares,
          SUM(CASE WHEN eventType = 'search_used' THEN 1 ELSE 0 END) as searches
        FROM user_behavior_events
        WHERE userId = ? 
          AND tenantId = ?
      `, [userId, tenantId]);

      const filters = features[0]?.filters || 0;
      const sorts = features[0]?.sorts || 0;
      const compares = features[0]?.compares || 0;
      const searches = features[0]?.searches || 0;

      // Skor hesaplama
      let score = 0;
      if (filters > 0) score += 25;
      if (sorts > 0) score += 25;
      if (compares > 0) score += 25;
      if (searches > 5) score += 25;

      return Math.min(score, 100);
    } catch (error) {
      console.error('❌ Error getting tech adoption:', error);
      return 0;
    }
  }

  /**
   * Etkileşim seviyesi
   */
  async getEngagementLevel(userId, tenantId) {
    try {
      const [engagement] = await this.pool.execute(`
        SELECT 
          COUNT(DISTINCT DATE(timestamp)) as activeDays,
          COUNT(*) as totalEvents,
          COUNT(DISTINCT sessionId) as sessions
        FROM user_behavior_events
        WHERE userId = ? 
          AND tenantId = ?
          AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [userId, tenantId]);

      const activeDays = engagement[0]?.activeDays || 0;
      const totalEvents = engagement[0]?.totalEvents || 0;
      const sessions = engagement[0]?.sessions || 0;

      // Etkileşim seviyesini belirle
      if (activeDays >= 20 && totalEvents > 100 && sessions > 15) {
        return 'yüksek';
      } else if (activeDays >= 10 && totalEvents > 50 && sessions > 5) {
        return 'orta';
      } else {
        return 'düşük';
      }
    } catch (error) {
      console.error('❌ Error getting engagement level:', error);
      return 'düşük';
    }
  }

  /**
   * Aktif saatler
   */
  async getActiveHours(userId, tenantId) {
    try {
      const [hours] = await this.pool.execute(`
        SELECT 
          HOUR(timestamp) as hour,
          COUNT(*) as count
        FROM user_behavior_events
        WHERE userId = ? 
          AND tenantId = ?
          AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY HOUR(timestamp)
        ORDER BY count DESC
        LIMIT 5
      `, [userId, tenantId]);

      return hours.map(h => h.hour);
    } catch (error) {
      console.error('❌ Error getting active hours:', error);
      return [];
    }
  }

  /**
   * Tercih edilen kategoriler
   */
  async getPreferredCategories(userId, tenantId) {
    try {
      const [categories] = await this.pool.execute(`
        SELECT 
          p.category,
          COUNT(*) as viewCount,
          COUNT(DISTINCT CASE WHEN ube.eventType = 'add_to_cart' THEN ube.id END) as cartCount
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        WHERE ube.userId = ? 
          AND ube.tenantId = ?
          AND ube.eventType IN ('product_view', 'add_to_cart')
          AND p.tenantId = ?
        GROUP BY p.category
        ORDER BY viewCount DESC
        LIMIT 5
      `, [userId, tenantId, tenantId]);

      return categories.map(c => ({
        category: c.category,
        viewCount: c.viewCount,
        cartCount: c.cartCount
      }));
    } catch (error) {
      console.error('❌ Error getting preferred categories:', error);
      return [];
    }
  }

  /**
   * Tercih edilen fiyat aralığı
   */
  async getPreferredPriceRange(userId, tenantId) {
    try {
      const [priceRange] = await this.pool.execute(`
        SELECT 
          MIN(p.price) as minPrice,
          MAX(p.price) as maxPrice,
          AVG(p.price) as avgPrice
        FROM user_behavior_events ube
        JOIN products p ON JSON_EXTRACT(ube.eventData, '$.productId') = p.id
        WHERE ube.userId = ? 
          AND ube.tenantId = ?
          AND ube.eventType = 'product_view'
          AND p.tenantId = ?
      `, [userId, tenantId, tenantId]);

      return {
        min: priceRange[0]?.minPrice || 0,
        max: priceRange[0]?.maxPrice || 0,
        avg: priceRange[0]?.avgPrice || 0
      };
    } catch (error) {
      console.error('❌ Error getting preferred price range:', error);
      return { min: 0, max: 0, avg: 0 };
    }
  }

  /**
   * Sosyal davranış skoru (0-100)
   */
  async getSocialBehavior(userId, tenantId) {
    try {
      const [social] = await this.pool.execute(`
        SELECT 
          SUM(CASE WHEN eventType = 'share' THEN 1 ELSE 0 END) as shares,
          SUM(CASE WHEN eventType = 'review' THEN 1 ELSE 0 END) as reviews,
          SUM(CASE WHEN eventType = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN eventType = 'referral_used' THEN 1 ELSE 0 END) as referrals
        FROM user_behavior_events
        WHERE userId = ? 
          AND tenantId = ?
      `, [userId, tenantId]);

      const shares = social[0]?.shares || 0;
      const reviews = social[0]?.reviews || 0;
      const likes = social[0]?.likes || 0;
      const referrals = social[0]?.referrals || 0;

      // Skor hesaplama
      let score = 0;
      if (shares > 0) score += 25;
      if (reviews > 0) score += 25;
      if (likes > 5) score += 25;
      if (referrals > 0) score += 25;

      return Math.min(score, 100);
    } catch (error) {
      console.error('❌ Error getting social behavior:', error);
      return 0;
    }
  }

  /**
   * Karar verme hızı
   */
  async getDecisionSpeed(userId, tenantId) {
    try {
      const [decisionTime] = await this.pool.execute(`
        SELECT AVG(TIMESTAMPDIFF(SECOND, viewTime, cartTime)) as avgTime
        FROM (
          SELECT 
            JSON_EXTRACT(v.eventData, '$.productId') as productId,
            MIN(v.timestamp) as viewTime,
            MIN(c.timestamp) as cartTime
          FROM user_behavior_events v
          JOIN user_behavior_events c ON 
            JSON_EXTRACT(v.eventData, '$.productId') = JSON_EXTRACT(c.eventData, '$.productId')
            AND v.userId = c.userId
          WHERE v.userId = ? 
            AND v.tenantId = ?
            AND v.eventType = 'product_view'
            AND c.eventType = 'add_to_cart'
            AND c.timestamp > v.timestamp
          GROUP BY JSON_EXTRACT(v.eventData, '$.productId')
        ) as decisionTimes
      `, [userId, tenantId]);

      const avgTime = decisionTime[0]?.avgTime || 0;

      if (avgTime < 60) {
        return 'hızlı';
      } else if (avgTime < 300) {
        return 'orta';
      } else {
        return 'yavaş';
      }
    } catch (error) {
      console.error('❌ Error getting decision speed:', error);
      return 'orta';
    }
  }

  /**
   * Karakteristikleri veritabanına kaydet
   */
  async saveCharacteristics(userId, tenantId, characteristics) {
    try {
      // user_characteristics tablosu yoksa oluştur
      await this.ensureTableExists();

      const [existing] = await this.pool.execute(`
        SELECT id FROM user_characteristics 
        WHERE userId = ? AND tenantId = ?
      `, [userId, tenantId]);

      if (existing.length > 0) {
        // Güncelle
        await this.pool.execute(`
          UPDATE user_characteristics SET
            preferences = ?,
            shoppingStyle = ?,
            priceSensitivityScore = ?,
            brandLoyaltyIndex = ?,
            technologyAdoptionScore = ?,
            engagementLevel = ?,
            activeHours = ?,
            preferredCategories = ?,
            preferredPriceRange = ?,
            socialBehaviorScore = ?,
            decisionSpeed = ?,
            lastUpdated = NOW()
          WHERE userId = ? AND tenantId = ?
        `, [
          JSON.stringify(characteristics.preferences),
          characteristics.shoppingStyle,
          characteristics.priceSensitivityScore,
          characteristics.brandLoyaltyIndex,
          characteristics.technologyAdoptionScore,
          characteristics.engagementLevel,
          JSON.stringify(characteristics.activeHours),
          JSON.stringify(characteristics.preferredCategories),
          JSON.stringify(characteristics.preferredPriceRange),
          characteristics.socialBehaviorScore,
          characteristics.decisionSpeed,
          userId,
          tenantId
        ]);
      } else {
        // Yeni kayıt
        await this.pool.execute(`
          INSERT INTO user_characteristics (
            userId, tenantId, preferences, shoppingStyle, priceSensitivityScore,
            brandLoyaltyIndex, technologyAdoptionScore, engagementLevel,
            activeHours, preferredCategories, preferredPriceRange,
            socialBehaviorScore, decisionSpeed, lastUpdated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          userId,
          tenantId,
          JSON.stringify(characteristics.preferences),
          characteristics.shoppingStyle,
          characteristics.priceSensitivityScore,
          characteristics.brandLoyaltyIndex,
          characteristics.technologyAdoptionScore,
          characteristics.engagementLevel,
          JSON.stringify(characteristics.activeHours),
          JSON.stringify(characteristics.preferredCategories),
          JSON.stringify(characteristics.preferredPriceRange),
          characteristics.socialBehaviorScore,
          characteristics.decisionSpeed
        ]);
      }
    } catch (error) {
      console.error('❌ Error saving characteristics:', error);
      throw error;
    }
  }

  /**
   * user_characteristics tablosunun varlığını kontrol et ve yoksa oluştur
   */
  async ensureTableExists() {
    try {
      await this.pool.execute(`
        CREATE TABLE IF NOT EXISTS user_characteristics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          tenantId INT NOT NULL,
          preferences JSON,
          shoppingStyle ENUM('impulsif', 'planlı', 'karşılaştırmalı') DEFAULT 'planlı',
          priceSensitivityScore DECIMAL(5,2) DEFAULT 0,
          brandLoyaltyIndex DECIMAL(5,2) DEFAULT 0,
          technologyAdoptionScore DECIMAL(5,2) DEFAULT 0,
          engagementLevel ENUM('yüksek', 'orta', 'düşük') DEFAULT 'düşük',
          activeHours JSON,
          preferredCategories JSON,
          preferredPriceRange JSON,
          socialBehaviorScore DECIMAL(5,2) DEFAULT 0,
          decisionSpeed ENUM('hızlı', 'orta', 'yavaş') DEFAULT 'orta',
          lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_characteristics (userId, tenantId),
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          INDEX idx_tenant (tenantId),
          INDEX idx_user (userId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error) {
      // Tablo zaten varsa hata vermez
      if (!error.message.includes('already exists')) {
        console.error('❌ Error creating user_characteristics table:', error);
      }
    }
  }

  /**
   * Kullanıcı karakteristiklerini getir
   */
  async getUserCharacteristics(userId, tenantId) {
    try {
      // Tablo yoksa oluştur
      await this.ensureTableExists();
      
      const [rows] = await this.pool.execute(`
        SELECT * FROM user_characteristics
        WHERE userId = ? AND tenantId = ?
      `, [userId, tenantId]);

      if (rows.length === 0) {
        // Karakteristikler yoksa hesapla
        try {
          return await this.calculateAndSaveUserCharacteristics(userId, tenantId);
        } catch (calcError) {
          console.error('❌ Error calculating characteristics:', calcError);
          // Hesaplama hatası durumunda default değerler döndür
          return this.getDefaultCharacteristics();
        }
      }

      const char = rows[0];
      return {
        preferences: JSON.parse(char.preferences || '{}'),
        shoppingStyle: char.shoppingStyle || 'planlı',
        priceSensitivityScore: char.priceSensitivityScore || 0,
        brandLoyaltyIndex: char.brandLoyaltyIndex || 0,
        technologyAdoptionScore: char.technologyAdoptionScore || 0,
        engagementLevel: char.engagementLevel || 'düşük',
        activeHours: JSON.parse(char.activeHours || '[]'),
        preferredCategories: JSON.parse(char.preferredCategories || '[]'),
        preferredPriceRange: JSON.parse(char.preferredPriceRange || '{}'),
        socialBehaviorScore: char.socialBehaviorScore || 0,
        decisionSpeed: char.decisionSpeed || 'orta',
        lastUpdated: char.lastUpdated
      };
    } catch (error) {
      console.error('❌ Error getting user characteristics:', error);
      // Tablo yoksa veya başka bir hata varsa default değerler döndür
      if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('doesn\'t exist') || error.message?.includes('Unknown column')) {
        return this.getDefaultCharacteristics();
      }
      return this.getDefaultCharacteristics();
    }
  }

  /**
   * Default karakteristik değerleri
   */
  getDefaultCharacteristics() {
    return {
      preferences: { categories: [], brands: [], colors: [], styles: [] },
      shoppingStyle: 'planlı',
      priceSensitivityScore: 0,
      brandLoyaltyIndex: 0,
      technologyAdoptionScore: 0,
      engagementLevel: 'düşük',
      activeHours: [],
      preferredCategories: [],
      preferredPriceRange: { min: 0, max: 0, avg: 0 },
      socialBehaviorScore: 0,
      decisionSpeed: 'orta',
      lastUpdated: new Date()
    };
  }

  /**
   * Tüm kullanıcıların karakteristiklerini getir (segment analizi için)
   */
  async getAllUserCharacteristics(tenantId, filters = {}) {
    try {
      // Tablo yoksa oluştur
      await this.ensureTableExists();

      let query = `
        SELECT 
          uc.*,
          u.name as userName,
          u.email
        FROM user_characteristics uc
        JOIN users u ON uc.userId = u.id
        WHERE uc.tenantId = ?
      `;
      const params = [tenantId];

      if (filters.engagementLevel) {
        query += ` AND uc.engagementLevel = ?`;
        params.push(filters.engagementLevel);
      }

      if (filters.shoppingStyle) {
        query += ` AND uc.shoppingStyle = ?`;
        params.push(filters.shoppingStyle);
      }

      query += ` ORDER BY uc.lastUpdated DESC LIMIT ? OFFSET ?`;
      params.push(filters.limit || 100, filters.offset || 0);

      const [rows] = await this.pool.execute(query, params);

      // Eğer hiç veri yoksa boş array döndür
      if (!rows || rows.length === 0) {
        return [];
      }

      return rows.map(row => {
        try {
          return {
            ...row,
            preferences: row.preferences ? (typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences) : {},
            activeHours: row.activeHours ? (typeof row.activeHours === 'string' ? JSON.parse(row.activeHours) : row.activeHours) : [],
            preferredCategories: row.preferredCategories ? (typeof row.preferredCategories === 'string' ? JSON.parse(row.preferredCategories) : row.preferredCategories) : [],
            preferredPriceRange: row.preferredPriceRange ? (typeof row.preferredPriceRange === 'string' ? JSON.parse(row.preferredPriceRange) : row.preferredPriceRange) : {}
          };
        } catch (parseError) {
          console.warn('⚠️ Error parsing JSON for row:', row.id, parseError);
          return {
            ...row,
            preferences: {},
            activeHours: [],
            preferredCategories: [],
            preferredPriceRange: {}
          };
        }
      });
    } catch (error) {
      console.error('❌ Error getting all user characteristics:', error);
      // Tablo yoksa veya başka bir hata varsa boş array döndür
      if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('doesn\'t exist') || error.message?.includes('Unknown column')) {
        return [];
      }
      // Diğer hatalar için de boş array döndür
      return [];
    }
  }
}

module.exports = CharacteristicService;

