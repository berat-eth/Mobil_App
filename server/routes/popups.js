const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için factory function
function createPopupsRouter(pool) {
  poolWrapper = pool;
  return router;
}

// Factory function olarak export et
module.exports = createPopupsRouter;

// Aktif popup'ları getir
router.get('/', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const now = new Date();
    const [popups] = await poolWrapper.execute(`
      SELECT id, title, content, imageUrl, type, priority, targetAudience, clickAction, 
             startDate, endDate, isActive, createdAt, updatedAt
      FROM popups 
      WHERE isActive = true
      AND (startDate IS NULL OR startDate <= ?)
      AND (endDate IS NULL OR endDate >= ?)
      ORDER BY priority DESC, createdAt DESC
    `, [now, now]);

    // JSON alanlarını parse et
    const parsedPopups = popups.map(popup => ({
      ...popup,
      targetAudience: popup.targetAudience ? JSON.parse(popup.targetAudience) : null,
      clickAction: popup.clickAction ? JSON.parse(popup.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedPopups
    });
  } catch (error) {
    console.error('Popup yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup yüklenirken hata oluştu'
    });
  }
});

// Tüm popup'ları getir (admin için)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { limit = 100 } = req.query;
    const [popups] = await poolWrapper.execute(`
      SELECT id, title, content, imageUrl, type, position, isDismissible, isRequired, priority, 
             targetAudience, clickAction, startDate, endDate, isActive, buttonText, buttonColor, 
             backgroundColor, textColor, width, height, autoClose, showDelay, createdAt, updatedAt
      FROM popups 
      ORDER BY priority DESC, createdAt DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // JSON alanlarını parse et
    const parsedPopups = popups.map(popup => ({
      ...popup,
      targetAudience: popup.targetAudience ? JSON.parse(popup.targetAudience) : null,
      clickAction: popup.clickAction ? JSON.parse(popup.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedPopups
    });
  } catch (error) {
    console.error('Tüm popup yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup yüklenirken hata oluştu'
    });
  }
});

// Tek popup getir
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    // Optimize: Sadece gerekli column'lar
    const [popups] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, priority, targetAudience, clickAction, startDate, endDate, isActive, createdAt, updatedAt FROM popups WHERE id = ?',
      [id]
    );

    if (popups.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Popup bulunamadı'
      });
    }

    const popup = popups[0];
    const parsedPopup = {
      ...popup,
      targetAudience: popup.targetAudience ? JSON.parse(popup.targetAudience) : null,
      clickAction: popup.clickAction ? JSON.parse(popup.clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedPopup
    });
  } catch (error) {
    console.error('Popup getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup getirilirken hata oluştu'
    });
  }
});

// Yeni popup oluştur
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
      content,
      imageUrl,
      type = 'modal',
      position = 'center',
      isActive = true,
      isDismissible = true,
      isRequired = false,
      priority = 1,
      startDate,
      endDate,
      targetAudience,
      clickAction = { type: 'none', value: '' },
      buttonText,
      buttonColor = '#3B82F6',
      backgroundColor,
      textColor = '#000000',
      width = '500px',
      height,
      autoClose = 0,
      showDelay = 0
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Başlık gerekli'
      });
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO popups (
        title, content, imageUrl, type, position, isActive, isDismissible, isRequired,
        priority, startDate, endDate, targetAudience, clickAction, buttonText,
        buttonColor, backgroundColor, textColor, width, height, autoClose, showDelay
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      content || null,
      imageUrl || null,
      type,
      position,
      isActive,
      isDismissible,
      isRequired,
      priority,
      startDate || null,
      endDate || null,
      targetAudience ? JSON.stringify(targetAudience) : null,
      JSON.stringify(clickAction),
      buttonText || null,
      buttonColor,
      backgroundColor || null,
      textColor,
      width,
      height || null,
      autoClose,
      showDelay
    ]);

    // Tüm alanları getir
    const [newPopup] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, position, isDismissible, isRequired, priority, targetAudience, clickAction, startDate, endDate, isActive, buttonText, buttonColor, backgroundColor, textColor, width, height, autoClose, showDelay, createdAt, updatedAt FROM popups WHERE id = ?',
      [result.insertId]
    );

    const parsedPopup = {
      ...newPopup[0],
      targetAudience: newPopup[0].targetAudience ? JSON.parse(newPopup[0].targetAudience) : null,
      clickAction: newPopup[0].clickAction ? JSON.parse(newPopup[0].clickAction) : { type: 'none', value: '' }
    };

    res.status(201).json({
      success: true,
      data: parsedPopup
    });
  } catch (error) {
    console.error('Popup oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup oluşturulurken hata oluştu'
    });
  }
});

// Popup güncelle
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'title', 'content', 'imageUrl', 'type', 'position', 'isActive',
      'isDismissible', 'isRequired', 'priority', 'startDate', 'endDate',
      'targetAudience', 'clickAction', 'buttonText', 'buttonColor',
      'backgroundColor', 'textColor', 'width', 'height', 'autoClose', 'showDelay'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'targetAudience' || field === 'clickAction') {
          updateFields.push(`${field} = ?`);
          updateValues.push(JSON.stringify(req.body[field]));
        } else {
          updateFields.push(`${field} = ?`);
          updateValues.push(req.body[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    // Popup'ın var olup olmadığını kontrol et - Optimize: Sadece gerekli column'lar
    const [existing] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, priority, targetAudience, clickAction, startDate, endDate, isActive FROM popups WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Popup bulunamadı'
      });
    }

    updateValues.push(id);
    await poolWrapper.execute(
      `UPDATE popups SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      updateValues
    );

    // Güncellenmiş popup'ı getir - Tüm alanları getir
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, position, isDismissible, isRequired, priority, targetAudience, clickAction, startDate, endDate, isActive, buttonText, buttonColor, backgroundColor, textColor, width, height, autoClose, showDelay, createdAt, updatedAt FROM popups WHERE id = ?',
      [id]
    );

    const parsedPopup = {
      ...updated[0],
      targetAudience: updated[0].targetAudience ? JSON.parse(updated[0].targetAudience) : null,
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedPopup
    });
  } catch (error) {
    console.error('Popup güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup güncellenirken hata oluştu'
    });
  }
});

// Popup sil
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
      'DELETE FROM popups WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Popup bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Popup başarıyla silindi'
    });
  } catch (error) {
    console.error('Popup silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup silinirken hata oluştu'
    });
  }
});

// Popup durumunu değiştir
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
    const [popup] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, priority, targetAudience, clickAction, startDate, endDate, isActive FROM popups WHERE id = ?',
      [id]
    );

    if (popup.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Popup bulunamadı'
      });
    }

    const newActiveState = !popup[0].isActive;
    await poolWrapper.execute(
      'UPDATE popups SET isActive = ?, updatedAt = NOW() WHERE id = ?',
      [newActiveState, id]
    );

    // Tüm alanları getir
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, content, imageUrl, type, position, isDismissible, isRequired, priority, targetAudience, clickAction, startDate, endDate, isActive, buttonText, buttonColor, backgroundColor, textColor, width, height, autoClose, showDelay, createdAt, updatedAt FROM popups WHERE id = ?',
      [id]
    );

    const parsedPopup = {
      ...updated[0],
      targetAudience: updated[0].targetAudience ? JSON.parse(updated[0].targetAudience) : null,
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedPopup
    });
  } catch (error) {
    console.error('Popup durum değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Popup durumu değiştirilirken hata oluştu'
    });
  }
});

// Popup istatistiklerini güncelle (view, click, dismissal)
router.post('/:id/stats', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const { action } = req.body; // 'view', 'click', 'dismissal'

    let updateField = '';
    switch (action) {
      case 'view':
        updateField = 'views = views + 1';
        break;
      case 'click':
        updateField = 'clicks = clicks + 1';
        break;
      case 'dismissal':
        updateField = 'dismissals = dismissals + 1';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Geçersiz aksiyon. view, click veya dismissal olmalı.'
        });
    }

    await poolWrapper.execute(
      `UPDATE popups SET ${updateField}, updatedAt = NOW() WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'İstatistik güncellendi'
    });
  } catch (error) {
    console.error('Popup istatistik güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistik güncellenirken hata oluştu'
    });
  }
});

