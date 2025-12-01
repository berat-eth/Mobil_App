const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { resizeStoryImage } = require('../utils/image-resizer');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için factory function
function createStoriesRouter(pool) {
  poolWrapper = pool;
  return router;
}

// Factory function olarak export et
module.exports = createStoriesRouter;

// poolWrapper'ı middleware ile al
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// Aktif story'leri getir
router.get('/', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { limit = 20 } = req.query;
    const [stories] = await poolWrapper.execute(`
      SELECT id, title, imageUrl, clickAction, \`order\`, expiresAt, createdAt, updatedAt
      FROM stories 
      WHERE isActive = true 
      AND (expiresAt IS NULL OR expiresAt > NOW())
      ORDER BY \`order\` ASC
      LIMIT ?
    `, [parseInt(limit)]);

    // JSON alanlarını parse et
    const parsedStories = stories.map(story => ({
      ...story,
      clickAction: story.clickAction ? JSON.parse(story.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedStories
    });
  } catch (error) {
    console.error('Story yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story yüklenirken hata oluştu'
    });
  }
});

// Tüm story'leri getir (admin için)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    // poolWrapper'ı tekrar kontrol et
    const currentPool = poolWrapper || req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
    if (!currentPool) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { limit = 50 } = req.query;
    const [stories] = await currentPool.execute(`
      SELECT id, title, image, clickAction, \`order\`, isActive, expiresAt, createdAt, updatedAt
      FROM stories 
      ORDER BY \`order\` ASC
      LIMIT ?
    `, [parseInt(limit)]);

    // JSON alanlarını parse et
    const parsedStories = stories.map(story => ({
      ...story,
      clickAction: story.clickAction ? JSON.parse(story.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedStories
    });
  } catch (error) {
    console.error('Tüm story yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story yüklenirken hata oluştu'
    });
  }
});

// Yeni story oluştur
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive = true,
      order,
      expiresAt,
      clickAction
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve resim URL\'si gerekli'
      });
    }

    // Görseli otomatik olarak story boyutuna getir (1080x1920)
    let processedImageUrl = imageUrl;
    try {
      if (imageUrl && imageUrl.startsWith('http')) {
        console.log('🖼️ Story görseli boyutlandırılıyor:', imageUrl);
        processedImageUrl = await resizeStoryImage(imageUrl);
        console.log('✅ Story görseli boyutlandırıldı:', processedImageUrl);
      }
    } catch (error) {
      console.error('⚠️ Görsel boyutlandırma hatası, orijinal görsel kullanılıyor:', error.message);
      // Hata durumunda orijinal URL'i kullan
    }

    // Order belirlenmesi - eğer verilmemişse en yüksek order + 1
    let finalOrder = order;
    if (!finalOrder) {
      const [maxOrderResult] = await poolWrapper.execute(
        'SELECT MAX(`order`) as maxOrder FROM stories'
      );
      finalOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO stories (title, description, imageUrl, thumbnailUrl, videoUrl, isActive, \`order\`, expiresAt, clickAction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description || null,
      processedImageUrl,
      thumbnailUrl || null,
      videoUrl || null,
      isActive,
      finalOrder,
      expiresAt || null,
      JSON.stringify(clickAction || { type: 'none', value: '' })
    ]);

    // Optimize: Sadece gerekli column'lar
    const [newStory] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, expiresAt, createdAt, updatedAt FROM stories WHERE id = ?',
      [result.insertId]
    );

    const parsedStory = {
      ...newStory[0],
      clickAction: newStory[0].clickAction ? JSON.parse(newStory[0].clickAction) : { type: 'none', value: '' }
    };

    res.status(201).json({
      success: true,
      data: parsedStory
    });
  } catch (error) {
    console.error('Story oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story oluşturulurken hata oluştu'
    });
  }
});

// Story güncelle
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive,
      order,
      expiresAt,
      clickAction
    } = req.body;

    // Story'nin var olup olmadığını kontrol et
    // Optimize: Sadece gerekli column'lar
    const [existing] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, clickAction, \`order\`, isActive, expiresAt FROM stories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    // Güncelleme yap
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (imageUrl !== undefined) {
      // Görseli otomatik olarak story boyutuna getir (1080x1920)
      let processedImageUrl = imageUrl;
      try {
        if (imageUrl && imageUrl.startsWith('http')) {
          console.log('🖼️ Story görseli güncellenirken boyutlandırılıyor:', imageUrl);
          processedImageUrl = await resizeStoryImage(imageUrl);
          console.log('✅ Story görseli boyutlandırıldı:', processedImageUrl);
        }
      } catch (error) {
        console.error('⚠️ Görsel boyutlandırma hatası, orijinal görsel kullanılıyor:', error.message);
        processedImageUrl = imageUrl; // Hata durumunda orijinal URL'i kullan
      }
      updateFields.push('imageUrl = ?');
      updateValues.push(processedImageUrl);
    }
    if (thumbnailUrl !== undefined) {
      updateFields.push('thumbnailUrl = ?');
      updateValues.push(thumbnailUrl);
    }
    if (videoUrl !== undefined) {
      updateFields.push('videoUrl = ?');
      updateValues.push(videoUrl);
    }
    if (isActive !== undefined) {
      updateFields.push('isActive = ?');
      updateValues.push(isActive);
    }
    if (order !== undefined) {
      updateFields.push('`order` = ?');
      updateValues.push(order);
    }
    if (expiresAt !== undefined) {
      updateFields.push('expiresAt = ?');
      updateValues.push(expiresAt || null);
    }
    if (clickAction !== undefined) {
      updateFields.push('clickAction = ?');
      updateValues.push(JSON.stringify(clickAction));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    updateValues.push(id);
    await poolWrapper.execute(
      `UPDATE stories SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      updateValues
    );

    // Güncellenmiş story'yi getir - Optimize: Sadece gerekli column'lar
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, expiresAt, createdAt, updatedAt FROM stories WHERE id = ?',
      [id]
    );

    const parsedStory = {
      ...updated[0],
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedStory
    });
  } catch (error) {
    console.error('Story güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story güncellenirken hata oluştu'
    });
  }
});

// Story sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const [result] = await poolWrapper.execute(
      'DELETE FROM stories WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Story başarıyla silindi'
    });
  } catch (error) {
    console.error('Story silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story silinirken hata oluştu'
    });
  }
});

// Story durumunu değiştir
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    // Optimize: Sadece gerekli column'lar
    const [story] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, clickAction, \`order\`, isActive, expiresAt FROM stories WHERE id = ?',
      [id]
    );

    if (story.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Story bulunamadı'
      });
    }

    const newActiveState = !story[0].isActive;
    await poolWrapper.execute(
      'UPDATE stories SET isActive = ?, updatedAt = NOW() WHERE id = ?',
      [newActiveState, id]
    );

    // Optimize: Sadece gerekli column'lar
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, clickAction, \`order\`, isActive, expiresAt, createdAt, updatedAt FROM stories WHERE id = ?',
      [id]
    );

    const parsedStory = {
      ...updated[0],
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedStory
    });
  } catch (error) {
    console.error('Story durum değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story durumu değiştirilirken hata oluştu'
    });
  }
});

// Story sıralamasını güncelle
router.patch('/reorder', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { storyIds } = req.body;

    if (!Array.isArray(storyIds)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıralama verisi'
      });
    }

    // Transaction ile sıralama güncelle
    const connection = await poolWrapper.getConnection();
    try {
      await connection.beginTransaction();

      for (let i = 0; i < storyIds.length; i++) {
        await connection.execute(
          'UPDATE stories SET `order` = ?, updatedAt = NOW() WHERE id = ?',
          [i + 1, storyIds[i]]
        );
      }

      await connection.commit();
      res.json({
        success: true,
        message: 'Story sıralaması güncellendi'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Story sıralama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Story sıralaması güncellenirken hata oluştu'
    });
  }
});
