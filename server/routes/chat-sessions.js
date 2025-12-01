const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// Chat Sessions Route
// GET /api/chat/sessions - Tüm sessionları getir
router.get('/', async (req, res) => {
    try {
        const { ChatSession } = require('../orm/models');
        
        const sessions = await ChatSession.findAll({
            order: [['updatedAt', 'DESC']],
            include: [{
                model: require('../orm/models').ChatMessage,
                as: 'messages',
                limit: 1,
                order: [['createdAt', 'DESC']]
            }]
        });

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messageCount || 0,
            lastMessage: session.messages && session.messages.length > 0 
                ? session.messages[0].content.substring(0, 100) + '...'
                : null
        }));

        res.json({
            success: true,
            sessions: formattedSessions
        });
    } catch (error) {
        console.error('❌ Sessions yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Sessions yüklenemedi',
            error: error.message
        });
    }
});

// POST /api/chat/sessions - Yeni session oluştur
router.post('/', async (req, res) => {
    try {
        const { ChatSession, ChatMessage } = require('../orm/models');
        const { name, messages = [] } = req.body;

        // Yeni session oluştur
        const session = await ChatSession.create({
            name: name || `Sohbet ${new Date().toLocaleDateString('tr-TR')}`,
            messageCount: messages.length
        });

        // Eğer mesajlar varsa kaydet
        if (messages.length > 0) {
            const messagePromises = messages.map(msg => 
                ChatMessage.create({
                    sessionId: session.id,
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || new Date()
                })
            );
            await Promise.all(messagePromises);
        }

        res.json({
            success: true,
            sessionId: session.id,
            message: 'Session başarıyla oluşturuldu'
        });
    } catch (error) {
        console.error('❌ Session oluşturulamadı:', error);
        res.status(500).json({
            success: false,
            message: 'Session oluşturulamadı',
            error: error.message
        });
    }
});

// GET /api/chat/sessions/:id/messages - Session mesajlarını getir
router.get('/:id/messages', async (req, res) => {
    try {
        const { ChatMessage } = require('../orm/models');
        const { id } = req.params;

        const messages = await ChatMessage.findAll({
            where: { sessionId: id },
            order: [['createdAt', 'ASC']]
        });

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
        }));

        res.json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('❌ Session mesajları yüklenemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session mesajları yüklenemedi',
            error: error.message
        });
    }
});

// POST /api/chat/sessions/:id/messages - Session mesajlarını kaydet
router.post('/:id/messages', async (req, res) => {
    try {
        const { ChatSession, ChatMessage } = require('../orm/models');
        const { id } = req.params;
        const { messages } = req.body;

        // Session'ın var olduğunu kontrol et
        const session = await ChatSession.findByPk(id);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session bulunamadı'
            });
        }

        // Mevcut mesajları sil
        await ChatMessage.destroy({
            where: { sessionId: id }
        });

        // Yeni mesajları kaydet
        if (messages && messages.length > 0) {
            const messagePromises = messages.map(msg => 
                ChatMessage.create({
                    sessionId: id,
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || new Date()
                })
            );
            await Promise.all(messagePromises);
        }

        // Session'ı güncelle
        await session.update({
            messageCount: messages ? messages.length : 0,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Mesajlar başarıyla kaydedildi'
        });
    } catch (error) {
        console.error('❌ Mesajlar kaydedilemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar kaydedilemedi',
            error: error.message
        });
    }
});

// DELETE /api/chat/sessions/:id - Session sil
router.delete('/:id', async (req, res) => {
    try {
        const { ChatSession, ChatMessage } = require('../orm/models');
        const { id } = req.params;

        // Önce mesajları sil
        await ChatMessage.destroy({
            where: { sessionId: id }
        });

        // Sonra session'ı sil
        await ChatSession.destroy({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Session başarıyla silindi'
        });
    } catch (error) {
        console.error('❌ Session silinemedi:', error);
        res.status(500).json({
            success: false,
            message: 'Session silinemedi',
            error: error.message
        });
    }
});

module.exports = router;
