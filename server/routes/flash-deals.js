const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için factory function
function createFlashDealsRouter(pool) {
  poolWrapper = pool;
  return router;
}

// Factory function olarak export et
module.exports = createFlashDealsRouter;

// Get all flash deals (admin)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    console.log('⚡ Admin requesting flash deals');

    // Optimize: Sadece gerekli column'lar
    const [rows] = await poolWrapper.execute(`
      SELECT fd.id, fd.name, fd.description, fd.discount_type, fd.discount_value, fd.start_date, 
             fd.end_date, fd.is_active, fd.created_at, fd.updated_at
      FROM flash_deals fd
      ORDER BY fd.created_at DESC
    `);

    // ✅ OPTIMIZASYON: N+1 query fix - JOIN kullanarak tek sorguda tüm veriyi al
    const tenantId = req.tenant?.id;
    const dealIds = rows.map(d => d.id);
    
    let allDealProducts = [];
    let allDealCategories = [];
    
    if (dealIds.length > 0) {
      const placeholders = dealIds.map(() => '?').join(',');
      
      // Tüm deal'lerin ürünlerini tek sorguda al
      let productsQuery = `
        SELECT fdp.flash_deal_id, p.id, p.name, p.price, p.image, p.category, p.brand, p.description, 
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_products fdp
        JOIN products p ON fdp.product_id = p.id
        WHERE fdp.flash_deal_id IN (${placeholders})
      `;
      const productsParams = [...dealIds];
      
      if (tenantId) {
        productsQuery += ' AND p.tenantId = ?';
        productsParams.push(tenantId);
      }
      
      const [products] = await poolWrapper.execute(productsQuery, productsParams);
      allDealProducts = products || [];

      // Tüm deal'lerin kategorilerini tek sorguda al
      const [categories] = await poolWrapper.execute(`
        SELECT fdc.flash_deal_id, c.id, c.name
        FROM flash_deal_categories fdc
        JOIN categories c ON fdc.category_id = c.id
        WHERE fdc.flash_deal_id IN (${placeholders})
      `, dealIds);
      allDealCategories = categories || [];
    }
    
    // Products ve categories'i dealId'ye göre grupla
    const productsByDealId = {};
    allDealProducts.forEach(p => {
      if (!productsByDealId[p.flash_deal_id]) {
        productsByDealId[p.flash_deal_id] = [];
      }
      // flash_deal_id'yi kaldır
      const { flash_deal_id, ...product } = p;
      productsByDealId[p.flash_deal_id].push(product);
    });
    
    const categoriesByDealId = {};
    allDealCategories.forEach(c => {
      if (!categoriesByDealId[c.flash_deal_id]) {
        categoriesByDealId[c.flash_deal_id] = [];
      }
      // flash_deal_id'yi kaldır
      const { flash_deal_id, ...category } = c;
      categoriesByDealId[c.flash_deal_id].push(category);
    });

    const dealsWithTargets = rows.map((deal) => {
      const products = productsByDealId[deal.id] || [];
      const categories = categoriesByDealId[deal.id] || [];

      return {
        ...deal,
        products: products,
        categories: categories
      };
    });

    console.log('⚡ Flash deals found:', dealsWithTargets.length);
    res.json({ success: true, data: dealsWithTargets });
  } catch (error) {
    console.error('❌ Error getting flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting flash deals' });
  }
});

// Get active flash deals (mobile app)
router.get('/', async (req, res) => {
  try {
    if (!poolWrapper) {
      console.error('❌ poolWrapper not available in flash-deals route');
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const now = new Date();
    console.log('📅 Flash deals query - now:', now.toISOString());
    console.log('📅 Flash deals query - now (local):', now.toString());

    // Önce tüm flash deals'ı kontrol et (debug için) - Optimize: Sadece gerekli column'lar
    const [allDeals] = await poolWrapper.execute(`
      SELECT fd.id, fd.name, fd.is_active, fd.start_date, fd.end_date,
             CASE WHEN fd.is_active = 1 THEN 'YES' ELSE 'NO' END as active_status,
             CASE WHEN fd.start_date <= ? THEN 'YES' ELSE 'NO' END as started,
             CASE WHEN fd.end_date >= ? THEN 'YES' ELSE 'NO' END as not_ended
      FROM flash_deals fd
      ORDER BY fd.created_at DESC
      LIMIT 10
    `, [now, now]);
    console.log('🔍 All flash deals in DB (first 10):', allDeals.length);
    if (allDeals.length > 0) {
      console.log('🔍 Sample deal:', JSON.stringify({
        id: allDeals[0].id,
        name: allDeals[0].name,
        is_active: allDeals[0].is_active,
        active_status: allDeals[0].active_status,
        start_date: allDeals[0].start_date,
        end_date: allDeals[0].end_date,
        started: allDeals[0].started,
        not_ended: allDeals[0].not_ended,
        now: now.toISOString()
      }, null, 2));
    }

    // Farklı filtrelerle test et
    const [activeDeals] = await poolWrapper.execute(`
      SELECT COUNT(*) as count FROM flash_deals WHERE is_active = 1
    `);
    console.log('🔍 Active flash deals count (is_active=1):', activeDeals[0]?.count || 0);

    const [activeDealsBool] = await poolWrapper.execute(`
      SELECT COUNT(*) as count FROM flash_deals WHERE is_active = true
    `);
    console.log('🔍 Active flash deals count (is_active=true):', activeDealsBool[0]?.count || 0);

    const [allDealsCount] = await poolWrapper.execute(`
      SELECT COUNT(*) as count FROM flash_deals
    `);
    console.log('🔍 Total flash deals count:', allDealsCount[0]?.count || 0);

    // Tarih kontrolü için manuel sorgu
    const [dateCheck] = await poolWrapper.execute(`
      SELECT id, name, is_active, start_date, end_date,
             CASE WHEN start_date <= ? THEN 1 ELSE 0 END as is_started,
             CASE WHEN end_date >= ? THEN 1 ELSE 0 END as is_not_ended
      FROM flash_deals
      LIMIT 5
    `, [now, now]);
    console.log('🔍 Date check (first 5 deals):', JSON.stringify(dateCheck, null, 2));

    // Ana sorgu - Optimize: Sadece gerekli column'lar
    let [rows] = await poolWrapper.execute(`
      SELECT fd.id, fd.name, fd.description, fd.discount_type, fd.discount_value, fd.start_date, 
             fd.end_date, fd.is_active, fd.created_at, fd.updated_at
      FROM flash_deals fd
      WHERE (fd.is_active = 1 OR fd.is_active = true)
        AND fd.start_date <= NOW()
        AND fd.end_date >= NOW()
      ORDER BY fd.created_at DESC
    `);
    
    console.log('📊 Flash deals found in DB (active & date valid with NOW()):', rows.length);
    
    // Alternatif: Eğer hala sonuç yoksa, parametreli sorgu dene (MySQL timezone ile)
    if (rows.length === 0) {
      console.log('⚠️ Trying alternative query with MySQL CONVERT_TZ...');
      // MySQL'in timezone'ını kullan
      // Optimize: Sadece gerekli column'lar
      const [rowsAlt] = await poolWrapper.execute(`
        SELECT fd.id, fd.name, fd.description, fd.discount_type, fd.discount_value, fd.start_date, 
               fd.end_date, fd.is_active, fd.created_at, fd.updated_at
        FROM flash_deals fd
        WHERE (fd.is_active = 1 OR fd.is_active = true)
          AND fd.start_date <= CONVERT_TZ(NOW(), @@session.time_zone, '+00:00')
          AND fd.end_date >= CONVERT_TZ(NOW(), @@session.time_zone, '+00:00')
        ORDER BY fd.created_at DESC
      `);
      
      console.log('📊 Flash deals found (alternative query with CONVERT_TZ):', rowsAlt.length);
      if (rowsAlt.length > 0) {
        console.log('✅ Using alternative query results');
        rows = rowsAlt;
      } else {
        // Son çare: Tarih kontrolünü kaldır, sadece is_active kontrolü yap
        console.log('⚠️ Trying query without date check (only is_active)...');
        // Optimize: Sadece gerekli column'lar
        const [rowsNoDate] = await poolWrapper.execute(`
          SELECT fd.id, fd.name, fd.description, fd.discount_type, fd.discount_value, fd.start_date, 
                 fd.end_date, fd.is_active, fd.created_at, fd.updated_at
          FROM flash_deals fd
          WHERE (fd.is_active = 1 OR fd.is_active = true)
          ORDER BY fd.created_at DESC
        `);
        console.log('📊 Flash deals found (without date check):', rowsNoDate.length);
        if (rowsNoDate.length > 0) {
          console.log('✅ Using deals without date check (will filter manually)');
          // Manuel tarih kontrolü yap
          const validRows = rowsNoDate.filter(deal => {
            const startDate = new Date(deal.start_date);
            const endDate = new Date(deal.end_date);
            const isValid = startDate <= now && endDate >= now;
            if (!isValid) {
              console.log(`⚠️ Deal ${deal.id} filtered out: start=${deal.start_date}, end=${deal.end_date}, now=${now.toISOString()}`);
            }
            return isValid;
          });
          rows = validRows;
          console.log('📊 Flash deals after manual date filter:', rows.length);
        }
      }
    }

    // ✅ OPTIMIZASYON: N+1 query fix - Tüm deal'lerin ürünlerini tek sorguda al
    const tenantId = req.tenant?.id;
    const dealIds = rows.map(d => d.id);
    
    let allDealProducts = [];
    let allCategoryProducts = [];
    
    if (dealIds.length > 0) {
      const placeholders = dealIds.map(() => '?').join(',');
      
      // Tüm deal'lerin seçili ürünlerini tek sorguda al
      let productsQuery = `
        SELECT DISTINCT fdp.flash_deal_id, p.id, p.name, p.price, p.image, p.category, p.brand, p.description, 
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_products fdp
        JOIN products p ON fdp.product_id = p.id
        WHERE fdp.flash_deal_id IN (${placeholders})
      `;
      const productsParams = [...dealIds];
      
      if (tenantId) {
        productsQuery += ' AND p.tenantId = ?';
        productsParams.push(tenantId);
      }
      
      const [products] = await poolWrapper.execute(productsQuery, productsParams);
      allDealProducts = products || [];

      // Tüm deal'lerin kategori bazlı ürünlerini tek sorguda al
      let categoryProductsQuery = `
        SELECT DISTINCT fdc.flash_deal_id, p.id, p.name, p.price, p.image, p.category, p.brand, p.description,
               p.stock, p.rating, p.reviewCount, p.hasVariations, p.externalId, p.lastUpdated
        FROM flash_deal_categories fdc
        JOIN categories c ON fdc.category_id = c.id
        JOIN products p ON p.category = c.name
        WHERE fdc.flash_deal_id IN (${placeholders})
      `;
      const categoryProductsParams = [...dealIds];
      
      if (tenantId) {
        categoryProductsQuery += ' AND p.tenantId = ?';
        categoryProductsParams.push(tenantId);
      }
      
      const [categoryProducts] = await poolWrapper.execute(categoryProductsQuery, categoryProductsParams);
      allCategoryProducts = categoryProducts || [];
    }
    
    // Products'ı dealId'ye göre grupla
    const productsByDealId = {};
    allDealProducts.forEach(p => {
      if (!productsByDealId[p.flash_deal_id]) {
        productsByDealId[p.flash_deal_id] = [];
      }
      const { flash_deal_id, ...product } = p;
      productsByDealId[p.flash_deal_id].push(product);
    });
    
    const categoryProductsByDealId = {};
    allCategoryProducts.forEach(p => {
      if (!categoryProductsByDealId[p.flash_deal_id]) {
        categoryProductsByDealId[p.flash_deal_id] = [];
      }
      const { flash_deal_id, ...product } = p;
      categoryProductsByDealId[p.flash_deal_id].push(product);
    });

    const dealsWithProducts = rows.map((deal) => {
      // Birleştir ve duplicate'leri kaldır
      const dealProducts = productsByDealId[deal.id] || [];
      const dealCategoryProducts = categoryProductsByDealId[deal.id] || [];
      const allProducts = [...dealProducts, ...dealCategoryProducts];
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
      );

      return {
        ...deal,
        products: uniqueProducts
      };
    });

    console.log('⚡ Active flash deals found:', dealsWithProducts.length);
    if (dealsWithProducts.length > 0) {
      console.log('📦 Flash deals data sample:', JSON.stringify({
        id: dealsWithProducts[0].id,
        name: dealsWithProducts[0].name,
        productsCount: dealsWithProducts[0].products?.length || 0
      }, null, 2));
    }
    res.json({ success: true, data: dealsWithProducts });
  } catch (error) {
    console.error('❌ Error getting active flash deals:', error);
    res.status(500).json({ success: false, message: 'Error getting active flash deals' });
  }
});

// Create flash deal
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { name, description, discount_type, discount_value, start_date, end_date, product_ids, category_ids, is_active } = req.body;

    console.log('⚡ Creating flash deal:', { name, discount_type, discount_value, product_ids, category_ids });

    // Validate required fields
    if (!name || !discount_type || discount_value === undefined || discount_value === null || !start_date || !end_date) {
      console.log('❌ Validation failed:', { name, discount_type, discount_value, start_date, end_date });
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik'
      });
    }
    
    // Validate discount value
    const discountValueNum = parseFloat(discount_value);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'İndirim değeri 0\'dan büyük bir sayı olmalıdır'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz indirim türü'
      });
    }

    // Validate at least one product or category selected
    const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
    const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
    
    if (productIds.length === 0 && categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir ürün veya kategori seçilmelidir'
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Bitiş tarihi başlangıç tarihinden sonra olmalı'
      });
    }

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Insert flash deal
      const [result] = await connection.execute(`
        INSERT INTO flash_deals (name, description, discount_type, discount_value, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [name, description || '', discount_type, discount_value, start_date, end_date, is_active !== undefined ? is_active : true]);

      const flashDealId = result.insertId;

      // Insert products
      if (productIds.length > 0) {
        for (const productId of productIds) {
          await connection.execute(`
            INSERT INTO flash_deal_products (flash_deal_id, product_id)
            VALUES (?, ?)
          `, [flashDealId, productId]);
        }
      }

      // Insert categories
      if (categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
          await connection.execute(`
            INSERT INTO flash_deal_categories (flash_deal_id, category_id)
            VALUES (?, ?)
          `, [flashDealId, categoryId]);
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal created with ID:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla oluşturuldu',
        data: { id: flashDealId }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error creating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error creating flash deal' });
  }
});

// Update flash deal
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const flashDealId = req.params.id;
    const { name, description, discount_type, discount_value, start_date, end_date, is_active, product_ids, category_ids } = req.body;

    console.log('⚡ Updating flash deal:', flashDealId);

    // Start transaction
    const connection = await poolWrapper.getConnection();
    await connection.beginTransaction();

    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
      if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
      if (discount_type !== undefined) { updateFields.push('discount_type = ?'); updateValues.push(discount_type); }
      if (discount_value !== undefined) { updateFields.push('discount_value = ?'); updateValues.push(discount_value); }
      if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
      if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
      if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }

      if (updateFields.length > 0) {
        updateValues.push(flashDealId);
        const [result] = await connection.execute(`
          UPDATE flash_deals 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `, updateValues);

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Flash indirim bulunamadı'
          });
        }
      }

      // Update products if provided
      if (product_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_products WHERE flash_deal_id = ?', [flashDealId]);
        const productIds = Array.isArray(product_ids) ? product_ids.filter(Boolean) : [];
        if (productIds.length > 0) {
          for (const productId of productIds) {
            await connection.execute(`
              INSERT INTO flash_deal_products (flash_deal_id, product_id)
              VALUES (?, ?)
            `, [flashDealId, productId]);
          }
        }
      }

      // Update categories if provided
      if (category_ids !== undefined) {
        await connection.execute('DELETE FROM flash_deal_categories WHERE flash_deal_id = ?', [flashDealId]);
        const categoryIds = Array.isArray(category_ids) ? category_ids.filter(Boolean) : [];
        if (categoryIds.length > 0) {
          for (const categoryId of categoryIds) {
            await connection.execute(`
              INSERT INTO flash_deal_categories (flash_deal_id, category_id)
              VALUES (?, ?)
            `, [flashDealId, categoryId]);
          }
        }
      }

      await connection.commit();
      console.log('⚡ Flash deal updated:', flashDealId);
      res.json({
        success: true,
        message: 'Flash indirim başarıyla güncellendi'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error updating flash deal:', error);
    res.status(500).json({ success: false, message: 'Error updating flash deal' });
  }
});

// Delete flash deal
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const flashDealId = req.params.id;

    console.log('⚡ Deleting flash deal:', flashDealId);

    const [result] = await poolWrapper.execute(
      'DELETE FROM flash_deals WHERE id = ?',
      [flashDealId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flash indirim bulunamadı'
      });
    }

    console.log('⚡ Flash deal deleted:', flashDealId);
    res.json({
      success: true,
      message: 'Flash indirim başarıyla silindi'
    });
  } catch (error) {
    console.error('❌ Error deleting flash deal:', error);
    res.status(500).json({ success: false, message: 'Error deleting flash deal' });
  }
});

// Toggle flash deal active status
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;
    
    const [result] = await poolWrapper.execute(
      'UPDATE flash_deals SET is_active = ? WHERE id = ?',
      [isActive, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Flash deal not found' });
    }

    console.log('✅ Flash deal status toggled:', id, '->', isActive ? 'Active' : 'Inactive');
    res.json({
      success: true,
      message: 'Flash deal durumu güncellendi'
    });
  } catch (error) {
    console.error('❌ Error toggling flash deal status:', error);
    res.status(500).json({ success: false, message: 'Error toggling flash deal status' });
  }
});
