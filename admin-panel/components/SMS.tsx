'use client'

import { useState } from 'react'
import { Smartphone, Send, Users, Trash2, Edit, Plus, Copy, Search, MessageSquare, X, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SMSTemplate {
  id: number
  name: string
  message: string
  category: string
  charCount: number
  lastModified: string
}

interface SMSCampaign {
  id: number
  name: string
  message: string
  recipients: number
  sent: number
  delivered: number
  status: 'draft' | 'scheduled' | 'sent'
  date: string
}

export default function SMS() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns'>('templates')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [templateCategory, setTemplateCategory] = useState('Genel')

  const templates: SMSTemplate[] = [
    { id: 1, name: 'Hoş Geldin SMS', message: 'Merhaba! Aramıza hoş geldiniz. İlk alışverişinizde %10 indirim kodu: HOSGELDIN10', category: 'Karşılama', charCount: 85, lastModified: '2024-01-15' },
    { id: 2, name: 'Sipariş Onayı', message: 'Siparişiniz alındı! Sipariş No: #12345. Kargoya verildiğinde bilgilendirme yapılacaktır.', category: 'İşlem', charCount: 95, lastModified: '2024-01-14' },
    { id: 3, name: 'Kargo Bildirimi', message: 'Siparişiniz kargoya verildi! Takip No: ABC123456. Tahmini teslimat: 2-3 iş günü.', category: 'Bildirim', charCount: 92, lastModified: '2024-01-13' },
    { id: 4, name: 'İndirim Kampanyası', message: 'FLASH İNDİRİM! Bugün tüm ürünlerde %50 indirim. Kod: FLASH50. Son 6 saat!', category: 'Promosyon', charCount: 82, lastModified: '2024-01-12' },
    { id: 5, name: 'Doğum Günü', message: 'Mutlu yıllar! Size özel doğum günü hediyesi: %20 indirim. Kod: DOGUMGUNU20', category: 'Özel Gün', charCount: 78, lastModified: '2024-01-11' },
    { id: 6, name: 'OTP Kodu', message: 'Doğrulama kodunuz: 123456. Bu kodu kimseyle paylaşmayın. Geçerlilik: 5 dakika.', category: 'Güvenlik', charCount: 82, lastModified: '2024-01-10' },
  ]

  const campaigns: SMSCampaign[] = [
    { id: 1, name: 'Yaz İndirimleri 2024', message: 'Yaza özel %50 indirim! Kod: YAZ50', recipients: 25420, sent: 25420, delivered: 24890, status: 'sent', date: '2024-01-15' },
    { id: 2, name: 'Yeni Ürün Lansmanı', message: 'iPhone 15 Pro geldi! İlk 100 kişiye özel hediye.', recipients: 18000, sent: 18000, delivered: 17640, status: 'sent', date: '2024-01-14' },
    { id: 3, name: 'Haftalık Hatırlatma', message: 'Sepetinizde ürünler bekliyor. Hemen tamamla!', recipients: 12500, sent: 0, delivered: 0, status: 'scheduled', date: '2024-01-20' },
    { id: 4, name: 'VIP Müşteri Kampanyası', message: 'Sadece sizin için özel fırsatlar!', recipients: 3340, sent: 0, delivered: 0, status: 'draft', date: '-' },
  ]

  const insertVariable = (variable: string) => {
    setTemplateMessage(templateMessage + `{{${variable}}}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">SMS Pazarlama</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">SMS şablonları ve kampanya yönetimi</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-shadow">
          <Plus className="w-5 h-5" />
          <span>Yeni Kampanya</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white">
          <Send className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-green-100 text-sm mb-1">Gönderilen</p>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
          <Users className="w-6 h-6 opacity-80 mb-2" />
          <p className="text-blue-100 text-sm mb-1">Teslim Edilen</p>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Teslimat Oranı</p>
          <p className="text-3xl font-bold text-green-600">0%</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Aktif Şablon</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{templates.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>SMS Şablonları</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span>Kampanya Listesi</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Şablon ara..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Şablon</span>
                </button>
              </div>

              <div className="space-y-3">
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start justify-between p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{template.name}</h3>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                          {template.category}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{template.charCount} karakter</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{template.message}</p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{template.lastModified}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Düzenle">
                        <Edit className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </button>
                      <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Kopyala">
                        <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Sil">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div>
              <div className="space-y-3">
                {campaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100">{campaign.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            campaign.status === 'sent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            campaign.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {campaign.status === 'sent' ? 'Gönderildi' :
                             campaign.status === 'scheduled' ? 'Zamanlandı' : 'Taslak'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{campaign.message}</p>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Alıcı</p>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{campaign.recipients.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Gönderilen</p>
                            <p className="font-bold text-green-600">{campaign.sent.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Teslim</p>
                            <p className="font-bold text-blue-600">{campaign.delivered.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tarih</p>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{campaign.date}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create SMS Template Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Yeni SMS Şablonu</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">SMS içeriğinizi oluşturun</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şablon Adı *</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Örn: Hoş Geldin SMS"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kategori</label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-slate-100"
                    >
                      <option>Genel</option>
                      <option>Karşılama</option>
                      <option>İşlem</option>
                      <option>Bildirim</option>
                      <option>Promosyon</option>
                      <option>Özel Gün</option>
                      <option>Güvenlik</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SMS İçeriği *</label>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{templateMessage.length} / 160 karakter</span>
                  </div>
                  <textarea
                    value={templateMessage}
                    onChange={(e) => setTemplateMessage(e.target.value)}
                    placeholder="SMS mesajınızı yazın..."
                    rows={4}
                    maxLength={160}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Değişken Ekle:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => insertVariable('AD')}
                      className="px-3 py-1.5 bg-white dark:bg-dark-card border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                      Ad
                    </button>
                    <button
                      onClick={() => insertVariable('SOYAD')}
                      className="px-3 py-1.5 bg-white dark:bg-dark-card border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                      Soyad
                    </button>
                    <button
                      onClick={() => insertVariable('SIPARIS_NO')}
                      className="px-3 py-1.5 bg-white dark:bg-dark-card border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                      Sipariş No
                    </button>
                    <button
                      onClick={() => insertVariable('KOD')}
                      className="px-3 py-1.5 bg-white dark:bg-dark-card border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                      İndirim Kodu
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      alert('✅ SMS şablonu kaydedildi!')
                      setShowCreateModal(false)
                    }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                  >
                    Şablonu Kaydet
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
