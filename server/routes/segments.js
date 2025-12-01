const express = require('express');
const router = express.Router();

// Pool wrapper'ı almak için middleware ekle
let poolWrapper = null;

// Pool wrapper'ı set etmek için middleware
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// Segmentleri getir
router.get('/admin/segments', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        data: [],
        message: 'Veritabanı bağlantısı bulunamadı'
      });
    }

    const tenantId = req.headers['x-tenant-id'] || '1';
    
    // Veritabanından segmentleri getir
    const [segments] = await poolWrapper.execute(`
      SELECT 
        id,
        name,
        criteria,
        color,
        count,
        revenue,
        createdAt,
        updatedAt
      FROM segments 
      WHERE tenantId = ? 
      ORDER BY createdAt DESC
    `, [tenantId]);

    res.json({
      success: true,
      data: segments,
      message: 'Segmentler başarıyla getirildi'
    });
  } catch (error) {
    console.error('Segment getirme hatası:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'Segmentler getirilemedi'
    });
  }
});

// Yeni segment oluştur
router.post('/admin/segments', async (req, res) => {
  try {
    const { name, criteria, color } = req.body;

    if (!name || !criteria) {
      return res.status(400).json({
        success: false,
        message: 'Segment adı ve kriteri gereklidir'
      });
    }

    const tenantId = req.headers['x-tenant-id'] || '1';

    // Veritabanına segment ekle
    const [result] = await poolWrapper.execute(
      'INSERT INTO segments (tenantId, name, criteria, color, count, revenue) VALUES (?, ?, ?, ?, 0, 0)',
      [tenantId, name, criteria, color]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        criteria,
        color,
        count: 0,
        revenue: 0
      },
      message: 'Segment başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('Segment oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Segment oluşturulamadı'
    });
  }
});

// Segment kullanıcılarını getir
router.get('/admin/segments/:id/users', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const tenantId = req.headers['x-tenant-id'] || '1';

    // Veritabanından segment kullanıcılarını getir
    const [users] = await poolWrapper.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.address as city,
        COUNT(o.id) as totalOrders,
        COALESCE(SUM(o.totalAmount), 0) as totalSpent,
        CASE 
          WHEN COALESCE(SUM(o.totalAmount), 0) >= 10000 THEN 'Platinum'
          WHEN COALESCE(SUM(o.totalAmount), 0) >= 5000 THEN 'Gold'
          WHEN COALESCE(SUM(o.totalAmount), 0) >= 2000 THEN 'Silver'
          ELSE 'Bronze'
        END as membershipLevel,
        MAX(o.createdAt) as lastOrder
      FROM user_segments us
      JOIN users u ON us.userId = u.id
      LEFT JOIN orders o ON u.id = o.userId
      WHERE us.segmentId = ? AND us.tenantId = ?
      GROUP BY u.id, u.name, u.email, u.phone, u.address
    `, [segmentId, tenantId]);

    res.json({
      success: true,
      data: users,
      message: 'Segment kullanıcıları başarıyla getirildi'
    });
  } catch (error) {
    console.error('Segment kullanıcıları getirme hatası:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'Segment kullanıcıları getirilemedi'
    });
  }
});

// Segment güncelle
router.put('/admin/segments/:id', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const { name, criteria, color } = req.body;
    const tenantId = req.headers['x-tenant-id'] || '1';

    // Veritabanında segment güncelle
    await poolWrapper.execute(
      'UPDATE segments SET name = ?, criteria = ?, color = ? WHERE id = ? AND tenantId = ?',
      [name, criteria, color, segmentId, tenantId]
    );

    res.json({
      success: true,
      message: 'Segment başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Segment güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Segment güncellenemedi'
    });
  }
});

// Segment sil
router.delete('/admin/segments/:id', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const tenantId = req.headers['x-tenant-id'] || '1';

    // Veritabanından segment sil
    await poolWrapper.execute('DELETE FROM segments WHERE id = ? AND tenantId = ?', [segmentId, tenantId]);

    res.json({
      success: true,
      message: 'Segment başarıyla silindi'
    });
  } catch (error) {
    console.error('Segment silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Segment silinemedi'
    });
  }
});

module.exports = router;
