'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, Plus, Edit, Trash2, Search, Filter, Download, 
  Copy, ExternalLink, FileText, Calendar, User, Mail, 
  Phone, DollarSign, X, Loader2, CheckCircle2, XCircle, 
  AlertCircle, Eye, Upload
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Invoice {
  id: number
  invoiceNumber: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  orderId?: number
  amount: number
  taxAmount: number
  totalAmount: number
  currency: string
  invoiceDate: string
  dueDate?: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  fileName?: string
  fileSize?: number
  filePath?: string
  fileUrl?: string
  shareToken?: string
  shareUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    files: [] as File[]
  })

  useEffect(() => {
    loadInvoices()
  }, [searchQuery, statusFilter])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: Record<string, string> = {}
      if (searchQuery.trim()) params.q = searchQuery.trim()
      if (statusFilter) params.status = statusFilter
      
      // Faturaları yükle (backend'de filtrelenmiş olarak gelecek)
      const invoicesResponse = await api.get<ApiResponse<Invoice[]>>('/admin/invoices', params)
      
      if (invoicesResponse.success && invoicesResponse.data) {
        setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])
      } else {
        setInvoices([])
        if (invoicesResponse.message) {
          setError(invoicesResponse.message)
        }
      }
    } catch (err: any) {
      console.error('❌ Error loading invoices:', err)
      setError('Faturalar yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData({
      files: []
    })
    setShowAddModal(true)
    setError(null)
    setSuccess(null)
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      files: []
    })
    setShowEditModal(true)
    setError(null)
    setSuccess(null)
  }

  // Fatura ismini düzelt (Türkçe karakterleri koru, sadece özel karakterleri temizle)
  const fixInvoiceFileName = (fileName: string): string => {
    if (!fileName) return ''
    try {
      // URL decode et
      let decoded = fileName
      try {
        decoded = decodeURIComponent(fileName)
      } catch {
        decoded = fileName
      }
      
      // Encoding düzeltmeleri (ISO-8859-1 → UTF-8)
      const encodingFixes: Array<[RegExp, string]> = [
        [/Ä±/g, 'ı'], // Ä± → ı
        [/Ä°/g, 'İ'], // Ä° → İ
        [/ÄŸ/g, 'ğ'], // ÄŸ → ğ
        [/Äž/g, 'Ğ'], // Äž → Ğ
        [/Åž/g, 'Ş'], // Åž → Ş
        [/ÅŸ/g, 'ş'], // ÅŸ → ş
        [/Ã§/g, 'ç'], // Ã§ → ç
        [/Ã‡/g, 'Ç'], // Ã‡ → Ç
        [/Ã¼/g, 'ü'], // Ã¼ → ü
        [/Ãœ/g, 'Ü'], // Ãœ → Ü
        [/Ã¶/g, 'ö'], // Ã¶ → ö
        [/Ã–/g, 'Ö'], // Ã– → Ö
        [/\x9F/g, 'ğ'], // \x9F → ğ
        [/\x9E/g, 'Ğ'], // \x9E → Ğ
      ]
      
      let fixed = decoded
      for (const [pattern, replacement] of encodingFixes) {
        fixed = fixed.replace(pattern, replacement)
      }
      
      return fixed
    } catch (error) {
      console.error('Fatura ismi düzeltme hatası:', error)
      return fileName
    }
  }

  // Dosya adından invoice number oluştur (Türkçe karakterleri koru)
  const createInvoiceNumberFromFileName = (fileName: string): string => {
    if (!fileName) return `FAT-${Date.now()}`
    
    // Uzantıyı kaldır
    let name = fileName.replace(/\.pdf$/i, '')
    
    // Düzeltilmiş ismi al
    name = fixInvoiceFileName(name)
    
    // Sadece dosya sistemi için tehlikeli karakterleri temizle (Türkçe karakterleri koru)
    name = name
      .replace(/[<>:"|?*\x00-\x1F]/g, '') // Windows yasak karakterleri
      .replace(/\.\./g, '') // Path traversal
      .replace(/\/|\\/g, '-') // Path separator'ları
      .trim()
    
    return name || `FAT-${Date.now()}`
  }

  const handleSave = async () => {
    try {
      setError(null)
      setSuccess(null)
      setUploading(true)

      if (formData.files.length === 0) {
        setError('Lütfen en az bir PDF dosyası seçin')
        setUploading(false)
        return
      }

      // FormData için özel fetch kullan (api client FormData'yı desteklemiyor)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'

      if (editingInvoice) {
        // Düzenleme: Tek dosya
        if (formData.files.length > 1) {
          setError('Düzenleme için sadece bir dosya seçebilirsiniz')
          setUploading(false)
          return
        }

        const file = formData.files[0]
        const invoiceNumber = createInvoiceNumberFromFileName(file.name)

        const formDataToSend = new FormData()
        formDataToSend.append('invoiceNumber', invoiceNumber)
        formDataToSend.append('amount', '0')
        formDataToSend.append('totalAmount', '0')
        formDataToSend.append('currency', 'TRY')
        formDataToSend.append('invoiceDate', new Date().toISOString().split('T')[0])
        formDataToSend.append('status', 'draft')
        formDataToSend.append('file', file)

        const response = await fetch(`${API_BASE_URL}/admin/invoices/${editingInvoice.id}`, {
          method: 'PUT',
          headers: {
            'X-API-Key': API_KEY,
            'X-Admin-Key': ADMIN_KEY,
            'Authorization': `Bearer ${typeof window !== 'undefined' ? (sessionStorage.getItem('authToken') || '') : ''}`
          },
          body: formDataToSend
        }).then(r => r.json())

        if (response.success) {
          setSuccess('Fatura güncellendi')
          setShowEditModal(false)
          setEditingInvoice(null)
          loadInvoices()
          setTimeout(() => setSuccess(null), 3000)
        } else {
          setError(response.message || 'İşlem başarısız')
        }
      } else {
        // Toplu yükleme: Her dosya için ayrı fatura oluştur
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const file of formData.files) {
          try {
            const invoiceNumber = createInvoiceNumberFromFileName(file.name) || `FAT-${Date.now()}-${Math.random().toString(36).substring(7)}`

            const formDataToSend = new FormData()
            formDataToSend.append('invoiceNumber', invoiceNumber)
            formDataToSend.append('amount', '0')
            formDataToSend.append('totalAmount', '0')
            formDataToSend.append('currency', 'TRY')
            formDataToSend.append('invoiceDate', new Date().toISOString().split('T')[0])
            formDataToSend.append('status', 'draft')
            formDataToSend.append('file', file)

            const response = await fetch(`${API_BASE_URL}/admin/invoices`, {
              method: 'POST',
              headers: {
                'X-API-Key': API_KEY,
                'X-Admin-Key': ADMIN_KEY,
                'Authorization': `Bearer ${typeof window !== 'undefined' ? (sessionStorage.getItem('authToken') || '') : ''}`
              },
              body: formDataToSend
            }).then(r => r.json())

            if (response.success) {
              successCount++
            } else {
              errorCount++
              errors.push(`${file.name}: ${response.message || 'Yükleme başarısız'}`)
            }
          } catch (err: any) {
            errorCount++
            errors.push(`${file.name}: ${err.message || 'Yükleme hatası'}`)
          }
        }

        if (successCount > 0) {
          setSuccess(`${successCount} fatura başarıyla yüklendi${errorCount > 0 ? `, ${errorCount} hata oluştu` : ''}`)
          setShowAddModal(false)
          loadInvoices()
          setTimeout(() => setSuccess(null), 5000)
        }
        
        if (errorCount > 0) {
          setError(errors.join('; '))
        }
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await api.delete<ApiResponse<void>>(`/admin/invoices/${id}`)
      if (response.success) {
        setSuccess('Fatura silindi')
        loadInvoices()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Silme işlemi başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'Silme işlemi sırasında bir hata oluştu')
    }
  }

  const copyShareLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl)
    setSuccess('Link kopyalandı!')
    setTimeout(() => setSuccess(null), 2000)
  }

  const showPDFInIframe = (pdfUrl: string) => {
    // Mevcut iframe varsa kaldır
    const existingContainer = document.getElementById('pdf-viewer-container')
    if (existingContainer) existingContainer.remove()
    
    // Iframe container oluştur
    const container = document.createElement('div')
    container.id = 'pdf-viewer-container'
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100%'
    container.style.height = '100vh'
    container.style.zIndex = '9999'
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'
    
    // Iframe oluştur
    const iframe = document.createElement('iframe')
    iframe.id = 'pdf-viewer-iframe'
    iframe.src = pdfUrl
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.backgroundColor = 'white'
    
    // Kapatma butonu
    const closeBtn = document.createElement('button')
    closeBtn.id = 'pdf-viewer-close'
    closeBtn.textContent = '✕ Kapat'
    closeBtn.style.position = 'absolute'
    closeBtn.style.top = '15px'
    closeBtn.style.right = '15px'
    closeBtn.style.zIndex = '10000'
    closeBtn.style.padding = '12px 24px'
    closeBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'
    closeBtn.style.color = 'white'
    closeBtn.style.border = 'none'
    closeBtn.style.borderRadius = '8px'
    closeBtn.style.cursor = 'pointer'
    closeBtn.style.fontSize = '14px'
    closeBtn.style.fontWeight = '600'
    closeBtn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)'
    closeBtn.onclick = () => {
      container.remove()
    }
    
    // Hover efekti
    closeBtn.onmouseenter = () => {
      closeBtn.style.backgroundColor = 'rgba(220, 38, 38, 0.9)'
    }
    closeBtn.onmouseleave = () => {
      closeBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'
    }
    
    container.appendChild(iframe)
    container.appendChild(closeBtn)
    document.body.appendChild(container)
    
    // ESC tuşu ile kapat
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        container.remove()
        document.removeEventListener('keydown', handleEsc)
      }
    }
    document.addEventListener('keydown', handleEsc)
  }

  const generateShareLink = async (invoiceId: number) => {
    try {
      setError(null)
      const response = await api.post<ApiResponse<{ shareUrl: string; shareToken: string }>>(`/admin/invoices/${invoiceId}/share`)
      if (response.success && response.data) {
        setSuccess('Paylaşım linki oluşturuldu!')
        loadInvoices() // Faturaları yeniden yükle (shareUrl güncellenmiş olacak)
        setTimeout(() => setSuccess(null), 3000)
        return response.data.shareUrl
      } else {
        setError(response.message || 'Paylaşım linki oluşturulamadı')
        return null
      }
    } catch (err: any) {
      setError(err.message || 'Paylaşım linki oluşturulurken bir hata oluştu')
      return null
    }
  }

  const viewInvoicePDF = async (invoice: Invoice) => {
    try {
      setError(null)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
      const token = sessionStorage.getItem('authToken') || ''
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      
      // Debug: Invoice verilerini kontrol et
      console.log('Invoice data:', invoice)
      
      if (!invoice.id) {
        setError('Fatura ID bulunamadı. Lütfen faturayı kontrol edin.')
        return
      }
      
      // Admin endpoint ile PDF'i blob olarak indir ve göster
      const downloadUrl = `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
      
      try {
        // Authentication header'ları ile PDF'i indir
        const response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key': API_KEY,
            'X-Admin-Key': ADMIN_KEY
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Fatura indirilemedi' }))
          setError(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
          return
        }

        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        // Blob URL'ini yeni sekmede aç
        try {
          const newWindow = window.open(blobUrl, '_blank')
          
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Popup engellenmişse, iframe ile göster
            showPDFInIframe(blobUrl)
          }
        } catch (err) {
          console.error('Window open error:', err)
          // Iframe ile göster
          showPDFInIframe(blobUrl)
        }
      } catch (fetchErr: any) {
        console.error('PDF indirme hatası:', fetchErr)
        setError(fetchErr.message || 'PDF indirilemedi')
      }
    } catch (err: any) {
      console.error('PDF görüntüleme hatası:', err)
      setError(err.message || 'PDF görüntülenirken bir hata oluştu')
    }
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Taslak'
      case 'sent': return 'Gönderildi'
      case 'paid': return 'Ödendi'
      case 'cancelled': return 'İptal'
      default: return status
    }
  }

  // Backend'den zaten filtrelenmiş veri geliyor, tekrar filtrelemeye gerek yok
  // Ama yine de güvenlik için client-side filtreleme de yapabiliriz (opsiyonel)
  const filteredInvoices = invoices


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Faturalar
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  PDF faturaları yükleyin ve müşterilerinizle paylaşın
                </p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Fatura</span>
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fatura numarası, müşteri adı veya e-posta ile ara..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="sent">Gönderildi</option>
              <option value="paid">Ödendi</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">Henüz fatura eklenmemiş</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              İlk Faturayı Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {/* Faturalar */}
            {filteredInvoices.map((invoice) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {fixInvoiceFileName(invoice.invoiceNumber)}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {invoice.customerName && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{invoice.customerName}</span>
                        </div>
                      )}
                      {invoice.customerEmail && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{invoice.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{Number(invoice.totalAmount || 0).toFixed(2)} {invoice.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!invoice.shareUrl && (
                      <button
                        onClick={async () => {
                          const shareUrl = await generateShareLink(invoice.id)
                          if (shareUrl) {
                            copyShareLink(shareUrl)
                          }
                        }}
                        className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        title="Paylaşım Linki Oluştur"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.shareUrl && (
                      <button
                        onClick={() => copyShareLink(invoice.shareUrl!)}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Linki Kopyala"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.id && (
                      <>
                        <button
                          onClick={() => viewInvoicePDF(invoice)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              if (!invoice.id) {
                                setError('Fatura ID bulunamadı. Lütfen faturayı kontrol edin.')
                                return
                              }
                              
                              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
                              const token = sessionStorage.getItem('authToken') || ''
                              const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                              const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
                              
                              // Admin endpoint ile direkt dosya indirme
                              const downloadUrl = `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                              
                              console.log('Downloading from direct backend URL:', downloadUrl)
                              
                              // Authentication header'ları ile PDF'i indir
                              const response = await fetch(downloadUrl, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'X-API-Key': API_KEY,
                                  'X-Admin-Key': ADMIN_KEY
                                }
                              })

                              if (!response.ok) {
                                const contentType = response.headers.get('content-type') || ''
                                if (contentType.includes('application/json')) {
                                  const errorData = await response.json()
                                  const errorMsg = errorData.message || `HTTP ${response.status}: ${response.statusText}`
                                  console.error('Download error:', {
                                    url: downloadUrl,
                                    status: response.status,
                                    error: errorData
                                  })
                                  if (errorMsg.includes('not found') || errorMsg.includes('bulunamadı') || errorMsg.includes('ERR_FILE_NOT_FOUND')) {
                                    setError('Fatura dosyası bulunamadı. Dosya backend\'de kaydedilmemiş olabilir. Lütfen faturayı yeniden yükleyin.')
                                  } else {
                                    setError(errorMsg)
                                  }
                                } else {
                                  const errorText = await response.text().catch(() => '')
                                  console.error('Download error (non-JSON):', {
                                    url: downloadUrl,
                                    status: response.status,
                                    text: errorText
                                  })
                                  setError(`HTTP ${response.status}: ${response.statusText}`)
                                }
                                return
                              }

                              const contentType = response.headers.get('content-type') || ''
                              if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
                                const blob = await response.blob()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = invoice.fileName || `fatura-${invoice.id}.pdf`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                document.body.removeChild(a)
                                setSuccess('Fatura indirildi')
                                setTimeout(() => setSuccess(null), 2000)
                              } else {
                                const text = await response.text()
                                try {
                                  const jsonData = JSON.parse(text)
                                  console.error('Invalid response format:', jsonData)
                                  setError(jsonData.message || 'Beklenmeyen yanıt formatı')
                                } catch {
                                  console.error('Invalid response format (non-JSON):', text)
                                  setError('PDF indirilemedi. Yanıt formatı geçersiz.')
                                }
                              }
                            } catch (err: any) {
                              console.error('PDF indirme hatası:', err)
                              setError(err.message || 'PDF indirilemedi')
                            }
                          }}
                          className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title="İndir"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {invoice.fileName && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>{fixInvoiceFileName(invoice.fileName)}</span>
                    {invoice.fileSize && (
                      <span className="text-xs">({(invoice.fileSize / 1024).toFixed(2)} KB)</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {(showAddModal || showEditModal) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingInvoice ? 'Fatura Düzenle' : 'Yeni Fatura'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        setShowEditModal(false)
                        setEditingInvoice(null)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      PDF Dosyası {!editingInvoice && <span className="text-red-500">*</span>}
                      {!editingInvoice && <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">(Birden fazla seçebilirsiniz)</span>}
                    </label>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        multiple={!editingInvoice}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setFormData({ ...formData, files })
                        }}
                        className="hidden"
                      />
                      <div className="px-8 py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-pink-500 dark:hover:border-pink-500 transition-colors text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <span className="text-base font-medium text-slate-600 dark:text-slate-400 block mb-2">
                          {formData.files.length === 0 
                            ? 'PDF dosyası seçin' 
                            : `${formData.files.length} dosya seçildi`}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Maksimum 10MB, sadece PDF formatı
                        </span>
                      </div>
                    </label>
                    {formData.files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                {file.name}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                ({(file.size / 1024).toFixed(2)} KB)
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const newFiles = formData.files.filter((_, i) => i !== index)
                                setFormData({ ...formData, files: newFiles })
                              }}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              title="Kaldır"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                      setEditingInvoice(null)
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploading || formData.files.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Yükleniyor...</span>
                      </>
                    ) : (
                      <span>Kaydet</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}

