'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Save, X, AlertCircle, CheckCircle2, Clock, Target, MousePointerClick } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { formatDDMMYYYY } from '@/lib/date'

interface Popup {
  id: string | number
  title: string
  content?: string
  imageUrl?: string
  type: 'modal' | 'banner' | 'toast' | 'slide-in'
  position: 'center' | 'top' | 'bottom' | 'top-right' | 'bottom-right'
  isActive: boolean
  isDismissible: boolean
  isRequired: boolean
  priority: number
  startDate?: string
  endDate?: string
  targetAudience?: any
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none'
    value: string
  }
  buttonText?: string
  buttonColor?: string
  backgroundColor?: string
  textColor?: string
  width?: string
  height?: string
  autoClose?: number
  showDelay?: number
  views?: number
  clicks?: number
  dismissals?: number
  createdAt: string
  updatedAt: string
}

export default function Popups() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    content: string
    imageUrl: string
    type: Popup['type']
    position: Popup['position']
    isActive: boolean
    isDismissible: boolean
    isRequired: boolean
    priority: number
    startDate: string
    endDate: string
    clickAction: { type: 'product' | 'category' | 'url' | 'none'; value: string }
    buttonText: string
    buttonColor: string
    backgroundColor: string
    textColor: string
    width: string
    height: string
    autoClose: number
    showDelay: number
  }>({
    title: '',
    content: '',
    imageUrl: '',
    type: 'modal',
    position: 'center',
    isActive: true,
    isDismissible: true,
    isRequired: false,
    priority: 1,
    startDate: '',
    endDate: '',
    clickAction: { type: 'none', value: '' },
    buttonText: '',
    buttonColor: '#3B82F6',
    backgroundColor: '',
    textColor: '#000000',
    width: '500px',
    height: '',
    autoClose: 0,
    showDelay: 0
  })

  // Popups yükle
  const loadPopups = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/popups/all') as any
      if (response.success) {
        setPopups(response.data || [])
      }
    } catch (error) {
      console.error('Popups yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPopups()
  }, [])

  const handleDelete = async (id: string | number) => {
    if (confirm('Silmek istediğinizden emin misiniz?')) {
      try {
        const response = await api.delete(`/admin/popups/${id}`) as any
        if (response.success) {
          await loadPopups() // Listeyi yenile
        }
      } catch (error) {
        console.error('Popup silme hatası:', error)
        alert('Popup silinirken hata oluştu')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPopup) {
        // Güncelle
        const response = await api.put(`/admin/popups/${editingPopup.id}`, formData) as any
        if (response.success) {
          await loadPopups() // Listeyi yenile
          setIsModalOpen(false)
          setEditingPopup(null)
        }
      } else {
        // Yeni oluştur
        const response = await api.post('/admin/popups', formData) as any
        if (response.success) {
          await loadPopups() // Listeyi yenile
          setIsModalOpen(false)
        }
      }
      // Form'u sıfırla
      setFormData({
        title: '',
        content: '',
        imageUrl: '',
        type: 'modal',
        position: 'center',
        isActive: true,
        isDismissible: true,
        isRequired: false,
        priority: 1,
        startDate: '',
        endDate: '',
        clickAction: { type: 'none', value: '' },
        buttonText: '',
        buttonColor: '#3B82F6',
        backgroundColor: '',
        textColor: '#000000',
        width: '500px',
        height: '',
        autoClose: 0,
        showDelay: 0
      })
    } catch (error) {
      console.error('Popup kaydetme hatası:', error)
      alert('Popup kaydedilirken hata oluştu')
    }
  }

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup)
    setFormData({
      title: popup.title,
      content: popup.content || '',
      imageUrl: popup.imageUrl || '',
      type: popup.type,
      position: popup.position,
      isActive: popup.isActive,
      isDismissible: popup.isDismissible,
      isRequired: popup.isRequired,
      priority: popup.priority,
      startDate: popup.startDate ? popup.startDate.substring(0, 16) : '',
      endDate: popup.endDate ? popup.endDate.substring(0, 16) : '',
      clickAction: popup.clickAction || { type: 'none', value: '' },
      buttonText: popup.buttonText || '',
      buttonColor: popup.buttonColor || '#3B82F6',
      backgroundColor: popup.backgroundColor || '',
      textColor: popup.textColor || '#000000',
      width: popup.width || '500px',
      height: popup.height || '',
      autoClose: popup.autoClose || 0,
      showDelay: popup.showDelay || 0
    })
    setIsModalOpen(true)
  }

  const toggleActive = async (id: string | number) => {
    try {
      const popup = popups.find(p => p.id === id)
      if (!popup) return
      
      const response = await api.patch(`/admin/popups/${id}/toggle`, { isActive: !popup.isActive }) as any
      if (response.success) {
        setPopups(popups.map(p => p.id === id ? response.data : p))
      }
    } catch (error) {
      console.error('Popup durum değiştirme hatası:', error)
      alert('Popup durumu değiştirilirken hata oluştu')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Popup Yönetimi</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Popup'larınızı oluşturun ve yönetin
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPopup(null)
            setFormData({
              title: '',
              content: '',
              imageUrl: '',
              type: 'modal',
              position: 'center',
              isActive: true,
              isDismissible: true,
              isRequired: false,
              priority: 1,
              startDate: '',
              endDate: '',
              clickAction: { type: 'none', value: '' },
              buttonText: '',
              buttonColor: '#3B82F6',
              backgroundColor: '',
              textColor: '#000000',
              width: '500px',
              height: '',
              autoClose: 0,
              showDelay: 0
            })
            setIsModalOpen(true)
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Yeni Popup
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Popups List */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image Preview */}
              {popup.imageUrl && (
                <div className="h-48 bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                  <img
                    src={popup.imageUrl}
                    alt={popup.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      popup.isActive 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {popup.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      {popup.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {popup.type}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                        Öncelik: {popup.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {popup.content && (
                  <p className="text-sm text-slate-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {popup.content}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <div className="font-semibold text-slate-900 dark:text-white">{popup.views || 0}</div>
                    <div className="text-slate-500 dark:text-gray-400">Görüntülenme</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <div className="font-semibold text-slate-900 dark:text-white">{popup.clicks || 0}</div>
                    <div className="text-slate-500 dark:text-gray-400">Tıklama</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <div className="font-semibold text-slate-900 dark:text-white">{popup.dismissals || 0}</div>
                    <div className="text-slate-500 dark:text-gray-400">Kapatılma</div>
                  </div>
                </div>

                {/* Dates */}
                {(popup.startDate || popup.endDate) && (
                  <div className="mb-4 text-xs text-slate-500 dark:text-gray-400">
                    {popup.startDate && (
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" />
                        Başlangıç: {formatDDMMYYYY(new Date(popup.startDate))}
                      </div>
                    )}
                    {popup.endDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Bitiş: {formatDDMMYYYY(new Date(popup.endDate))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(popup.id)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      popup.isActive
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}
                  >
                    {popup.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                  </button>
                  <button
                    onClick={() => handleEdit(popup)}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && popups.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Henüz popup oluşturulmamış</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {editingPopup ? 'Popup Düzenle' : 'Yeni Popup'}
                </h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Başlık *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Tip
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Popup['type'] })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="modal">Modal</option>
                      <option value="banner">Banner</option>
                      <option value="toast">Toast</option>
                      <option value="slide-in">Slide-in</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    İçerik
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Görsel URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Tarih Aralığı */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Ayarlar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Konum
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as Popup['position'] })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="center">Merkez</option>
                      <option value="top">Üst</option>
                      <option value="bottom">Alt</option>
                      <option value="top-right">Üst Sağ</option>
                      <option value="bottom-right">Alt Sağ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Öncelik
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Genişlik
                    </label>
                    <input
                      type="text"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                      placeholder="500px"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-gray-300">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isDismissible}
                      onChange={(e) => setFormData({ ...formData, isDismissible: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-gray-300">Kapatılabilir</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-gray-300">Zorunlu</span>
                  </label>
                </div>

                {/* Buton Ayarları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Buton Metni
                    </label>
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Buton Rengi
                    </label>
                    <input
                      type="color"
                      value={formData.buttonColor}
                      onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                      className="w-full h-10 border border-slate-300 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                </div>

                {/* Click Action */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Tıklama Aksiyonu
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={formData.clickAction.type}
                      onChange={(e) => setFormData({ ...formData, clickAction: { ...formData.clickAction, type: e.target.value as any } })}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="none">Yok</option>
                      <option value="url">URL</option>
                      <option value="category">Kategori</option>
                      <option value="product">Ürün</option>
                    </select>
                    <input
                      type="text"
                      value={formData.clickAction.value}
                      onChange={(e) => setFormData({ ...formData, clickAction: { ...formData.clickAction, value: e.target.value } })}
                      placeholder="URL veya ID"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

