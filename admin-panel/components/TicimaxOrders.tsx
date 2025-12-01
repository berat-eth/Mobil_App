'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, Search, Loader2, X, User, Mail, Phone, 
  Calendar, DollarSign, Package, MapPin, Upload, Trash2, FileSpreadsheet, Eye, Truck, Code, FileJson, Receipt, Printer, FileText, Download, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse, translateError } from '@/lib/api'

interface TicimaxOrder {
  id: number
  externalOrderId: string
  orderNumber?: string
  totalAmount: number
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  city?: string
  district?: string
  fullAddress?: string
  cargoProviderName?: string
  cargoTrackingNumber?: string
  barcode?: string
  orderDate?: string
  createdAt: string
  orderData?: any // JSON data from Excel import
  items?: Array<{
    id: number
    productName: string
    quantity: number
    price: number
    productSku?: string
  }>
}

export default function TicimaxOrders() {
  const [orders, setOrders] = useState<TicimaxOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<TicimaxOrder | null>(null)
  const [showInvoicesModal, setShowInvoicesModal] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [invoiceLink, setInvoiceLink] = useState<string>('')
  const [referenceNumber, setReferenceNumber] = useState<string>('')

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [statusFilter, startDate, endDate, sortOrder])

  // Sipariş detay modalı açıldığında faturaları otomatik yükle
  useEffect(() => {
    if (showOrderDetailModal && selectedOrder) {
      loadInvoices()
    }
  }, [showOrderDetailModal, selectedOrder])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      params.sortOrder = sortOrder
      
      const response = await api.get<ApiResponse<TicimaxOrder[]>>('/admin/ticimax-orders', params)
      if (response.success && response.data) {
        setOrders(response.data)
        const responseWithTotal = response as any
        if (responseWithTotal.total !== undefined) {
          setTotalOrders(responseWithTotal.total)
        } else {
          setTotalOrders(response.data.length)
        }
        if (responseWithTotal.totalAmount !== undefined) {
          setTotalAmount(responseWithTotal.totalAmount)
        } else {
          const calculatedTotal = response.data.reduce((sum, order) => {
            return sum + (parseFloat(String(order.totalAmount || 0)))
          }, 0)
          setTotalAmount(calculatedTotal)
        }
      }
    } catch (err: any) {
      setError('Siparişler yüklenemedi: ' + translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Excel dosyalarını kabul et (.xls, .xlsx)
    if (!file.name.match(/\.(xls|xlsx)$/i) && !file.type.includes('spreadsheet')) {
      setError('Lütfen Excel dosyası seçin (.xls veya .xlsx)')
      return
    }
    
    try {
      setUploading(true)
      setError(null)
      setUploadSuccess(null)
      
      // FormData ile dosyayı gönder
      const formData = new FormData()
      formData.append('file', file)
      
      // API base URL'i al - api utility'sinden aynı değerleri kullan
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const token = sessionStorage.getItem('authToken') || ''
      
      const response = await fetch(`${API_BASE_URL}/admin/ticimax-orders/import`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
          // Content-Type header'ını ekleme - FormData için browser otomatik ekler
        },
        body: formData
      })
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          // JSON parse hatası, status text kullan
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const { imported, skipped, errors } = result.data
        setUploadSuccess(`${imported} sipariş başarıyla yüklendi${skipped > 0 ? `, ${skipped} sipariş atlandı` : ''}`)
        if (errors && errors.length > 0) {
          setError(`Bazı hatalar oluştu: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
        }
        
        // Siparişleri yeniden yükle
        await loadOrders()
        
        // Modal'ı kapat
        setShowUploadModal(false)
        
        // Başarı mesajını 5 saniye sonra temizle
        setTimeout(() => setUploadSuccess(null), 5000)
      } else {
        throw new Error(result.message || 'Sipariş yükleme başarısız')
      }
    } catch (err: any) {
      setError('Excel yükleme hatası: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setUploading(false)
      // Input'u temizle
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`"${orderNumber}" siparişini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingOrderId(orderId)
      setError(null)

      const response = await api.delete<ApiResponse<any>>(`/admin/ticimax-orders/${orderId}`)

      if (response.success) {
        setUploadSuccess('Sipariş başarıyla silindi')
        await loadOrders()
        setTimeout(() => setUploadSuccess(null), 3000)
      } else {
        throw new Error(response.message || 'Sipariş silinemedi')
      }
    } catch (err: any) {
      setError('Sipariş silinirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setDeletingOrderId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    }
    return labels[status] || status
  }

  const handleOrderClick = (order: TicimaxOrder) => {
    setSelectedOrder(order)
    setShowOrderDetailModal(true)
    // Modal açıldığında fatura linki ve referans numarasını temizle
    setInvoiceLink('')
    setReferenceNumber('')
    setSelectedInvoiceId(null)
  }

  // Faturaları yükle (hem modal hem de otomatik yükleme için)
  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true)
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data) {
        setInvoices(response.data)
        // İlk faturayı varsayılan olarak seç (sadece daha önce seçilmemişse)
        if (response.data.length > 0 && !selectedInvoiceId) {
          setSelectedInvoiceId(response.data[0].id)
        }
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  const handleShowInvoices = async () => {
    setShowInvoicesModal(true)
    // Faturalar zaten yüklenmişse tekrar yükleme
    if (invoices.length === 0) {
      await loadInvoices()
    }
  }

  const handleGenerateCargoSlip = async () => {
    if (!selectedOrder) return
    
    // API base URL'i fonksiyonun başında tanımla
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
    
    try {
    // Fatura linki veya seçili fatura kontrolü
    let invoiceUrl = ''
    
    if (invoiceLink && invoiceLink.trim()) {
      // Fatura linki girilmişse onu kullan
      invoiceUrl = invoiceLink.trim()
    } else if (selectedInvoiceId) {
      // Seçili faturayı bul
      const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId)
      if (!selectedInvoice) {
        alert('Seçili fatura bulunamadı.')
        return
      }
      
      // Direkt PDF dosyasına erişim için download URL'i oluştur
      if (selectedInvoice.id) {
        // Admin endpoint ile direkt dosya indirme
        invoiceUrl = `${API_BASE_URL}/admin/invoices/${selectedInvoice.id}/download`
      } else if (selectedInvoice.shareUrl) {
        // Share URL varsa download endpoint'ine yönlendir
        invoiceUrl = `${selectedInvoice.shareUrl}/download`
      }
    } else {
        alert('Lütfen bir fatura seçin veya fatura linki girin.')
      return
    }

      // Kargo bilgilerini al
      const cargoTrackingNumber = selectedOrder.cargoTrackingNumber || ''
      const cargoProviderName = selectedOrder.cargoProviderName || ''
      const barcode = selectedOrder.barcode || ''

      // Backend'e istek gönder (blob response için doğrudan fetch)
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
    const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
    const token = sessionStorage.getItem('authToken') || ''
    
      const response = await fetch(`${API_BASE_URL}/admin/generate-cargo-slip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          invoiceUrl: invoiceUrl,
          cargoTrackingNumber: cargoTrackingNumber,
          cargoProviderName: cargoProviderName,
          barcode: barcode,
          customerName: selectedOrder.customerName,
          customerEmail: selectedOrder.customerEmail,
          customerPhone: selectedOrder.customerPhone,
          customerAddress: selectedOrder.shippingAddress || selectedOrder.fullAddress,
          city: selectedOrder.city,
          district: selectedOrder.district,
          // Ürün bilgilerini gönder (quantity ve price dahil)
          items: (selectedOrder.items || []).map(item => ({
            productName: item.productName || '',
            productSku: item.productSku || '',
            quantity: item.quantity || 1,
            price: item.price || 0
          })),
          provider: 'ticimax', // Ticimax siparişi olduğunu belirt
          referenceNumber: referenceNumber || null // Referans numarası
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kargo-fisi-ticimax-${selectedOrder.orderNumber || selectedOrder.externalOrderId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Kargo fişi başarıyla indirildi, siparişleri yeniden yükle
        await loadOrders()
      } else {
        const errorText = await response.text()
        let errorMessage = 'Bilinmeyen hata'
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        alert('Kargo fişi oluşturulamadı: ' + errorMessage)
      }
    } catch (error: any) {
      console.error('Kargo fişi oluşturma hatası:', error)
      alert('Kargo fişi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const fixInvoiceFileName = (fileName: string) => {
    if (!fileName) return ''
    try {
      // Latin1 encoding sorununu düzelt
      return decodeURIComponent(escape(fileName))
    } catch {
      return fileName
    }
  }

  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.externalOrderId?.toLowerCase().includes(query) ||
        order.orderNumber?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.customerPhone?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Ticimax Siparişleri
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ticimax siparişlerini Excel ile yükleyebilir ve yönetebilirsiniz
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Excel Yükle
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalOrders}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Tutar</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Gösterilen</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{filteredOrders.length}</p>
            </div>
            <Search className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, müşteri adı..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Durum
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            >
              <option value="">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="processing">İşleniyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sıralama
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-bg dark:text-slate-200"
            >
              <option value="desc">En Yeni (Önce)</option>
              <option value="asc">En Eski (Önce)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hata ve Başarı Mesajları */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
          {uploadSuccess}
        </div>
      )}

      {/* Sipariş Listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border p-12 text-center">
          <Package className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Henüz sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => handleOrderClick(order)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                      {order.orderNumber || order.externalOrderId}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        <div className="font-medium">{order.customerName || '-'}</div>
                        {order.customerEmail && (
                          <div className="text-xs text-slate-500">{order.customerEmail}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-200">
                      {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {order.orderDate 
                        ? new Date(order.orderDate).toLocaleDateString('tr-TR')
                        : new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrderClick(order)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.orderNumber || order.externalOrderId)}
                          disabled={deletingOrderId === order.id}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Siparişi Sil"
                        >
                          {deletingOrderId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Excel Yükleme Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Excel Dosyası Yükle
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Excel dosyasını seçin (.xls veya .xlsx)
                  </p>
                  <input
                    type="file"
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                      uploading
                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Yükleniyor...
                      </span>
                    ) : (
                      'Dosya Seç'
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sipariş Detay Modal */}
      <AnimatePresence>
        {showOrderDetailModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowOrderDetailModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      Sipariş Detayı
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      📦 Ticimax - {selectedOrder.orderNumber || selectedOrder.externalOrderId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShowInvoices}
                      className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="Faturaları Görüntüle"
                    >
                      <Receipt className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleGenerateCargoSlip}
                      className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                      title="Kargo Fişi Oluştur"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setShowJsonModal(true)
                      }}
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="JSON Verisini Görüntüle"
                    >
                      <FileJson className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setShowOrderDetailModal(false)
                        setSelectedOrder(null)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Fatura Seçimi */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Fatura Bilgileri</h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Fatura Linki */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Fatura Linki (Opsiyonel)
                      </label>
                      <input
                        type="text"
                        value={invoiceLink}
                        onChange={(e) => {
                          setInvoiceLink(e.target.value)
                          if (e.target.value.trim()) {
                            setSelectedInvoiceId(null)
                          }
                        }}
                        placeholder="https://api.huglutekstil.com/api/invoices/share/..."
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {invoiceLink && invoiceLink.trim() && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Fatura linki girildi. Bu link QR kodda kullanılacak.
                        </p>
                      )}
                    </div>
                    
                    {/* Fatura Seçimi - Link girildiğinde devre dışı */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Kargo Fişi için Fatura Seçimi
                      </label>
                      {invoicesLoading ? (
                        <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">Faturalar yükleniyor...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedInvoiceId || ''}
                          onChange={(e) => {
                            setSelectedInvoiceId(e.target.value ? Number(e.target.value) : null)
                            if (e.target.value) {
                              setInvoiceLink('')
                            }
                          }}
                          disabled={!!(invoiceLink && invoiceLink.trim())}
                          className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            invoiceLink && invoiceLink.trim() 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          <option value="">Fatura Seçiniz</option>
                          {invoices.length === 0 ? (
                            <option value="" disabled>Fatura bulunamadı</option>
                          ) : (
                            invoices.map((invoice) => (
                              <option key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber || `Fatura #${invoice.id}`} 
                                {invoice.fileName && ` - ${fixInvoiceFileName(invoice.fileName)}`}
                                {invoice.totalAmount && ` (${Number(invoice.totalAmount).toFixed(2)} ${invoice.currency || 'TRY'})`}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                      {selectedInvoiceId && !invoiceLink && !invoicesLoading && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Seçili fatura kargo fişindeki QR kodda kullanılacak
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Referans Numarası */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Referans Numarası</h3>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Referans Numarası
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Referans numarasını girin"
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Bu referans numarası kargo fişindeki kargo bilgileri kısmında görüntülenecek ve EAN-16 barkodu oluşturulacak.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sipariş Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Sipariş Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-400">Sipariş Numarası</label>
                      <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.orderNumber || selectedOrder.externalOrderId}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-400">Durum</label>
                      <p className="text-slate-900 dark:text-slate-200 font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusLabel(selectedOrder.status)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-400">Toplam Tutar</label>
                      <p className="text-slate-900 dark:text-slate-200 font-medium text-lg">
                        {selectedOrder.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-400">Sipariş Tarihi</label>
                      <p className="text-slate-900 dark:text-slate-200 font-medium">
                        {selectedOrder.orderDate 
                          ? new Date(selectedOrder.orderDate).toLocaleString('tr-TR')
                          : new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Müşteri Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Müşteri Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrder.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Ad Soyad</label>
                          <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.customerName}</p>
                        </div>
                      </div>
                    )}
                    {selectedOrder.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">E-posta</label>
                          <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.customerEmail}</p>
                        </div>
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Telefon</label>
                          <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.customerPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Adres Bilgileri */}
                {(selectedOrder.shippingAddress || selectedOrder.fullAddress || selectedOrder.city || selectedOrder.district) && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Teslimat Adresi</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-dark-border">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-slate-900 dark:text-slate-200">
                            {selectedOrder.fullAddress || selectedOrder.shippingAddress || '-'}
                          </p>
                          {(selectedOrder.city || selectedOrder.district) && (
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                              {selectedOrder.district && `${selectedOrder.district}, `}{selectedOrder.city}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Kargo Bilgileri */}
                {(selectedOrder.cargoProviderName || selectedOrder.cargoTrackingNumber || selectedOrder.barcode) && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Kargo Bilgileri</h3>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-dark-border space-y-3">
                      {selectedOrder.cargoProviderName && (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <div>
                            <label className="text-sm text-slate-600 dark:text-slate-400">Kargo Firması</label>
                            <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.cargoProviderName}</p>
                          </div>
                        </div>
                      )}
                      {selectedOrder.cargoTrackingNumber && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Takip Numarası</label>
                          <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedOrder.cargoTrackingNumber}</p>
                        </div>
                      )}
                      {selectedOrder.barcode && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Barkod</label>
                          <p className="text-slate-900 dark:text-slate-200 font-medium font-mono">{selectedOrder.barcode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sipariş Öğeleri */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                      Sipariş Öğeleri ({selectedOrder.items.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div
                          key={item.id || `item-${selectedOrder.id}-${idx}`}
                          className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-dark-border"
                        >
                          <Package className="w-8 h-8 text-blue-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-slate-200">{item.productName}</p>
                            {item.productSku && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">SKU: {item.productSku}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Adet: {item.quantity}</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-200">
                              {item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Toplam: {(item.price * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarih Bilgileri */}
                <div className="border-t border-slate-200 dark:border-dark-border pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedOrder.orderDate && (
                    <div>
                        <label className="text-slate-600 dark:text-slate-400">Sipariş Tarihi</label>
                        <p className="text-slate-900 dark:text-slate-200 font-medium">
                          {new Date(selectedOrder.orderDate).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-slate-600 dark:text-slate-400">İmport Tarihi</label>
                      <p className="text-slate-900 dark:text-slate-200 font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Invoices Modal */}
      <AnimatePresence>
          {showInvoicesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowInvoicesModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6" />
                        PDF Faturalar
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Sisteme yüklenmiş tüm faturalar
                    </p>
                  </div>
                  <button
                    onClick={() => {
                        setShowInvoicesModal(false)
                    }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                  {invoicesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">Henüz fatura yüklenmemiş</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {invoice.invoiceNumber || `Fatura #${invoice.id}`}
                                </h3>
                                {invoice.fileName && (
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {fixInvoiceFileName(invoice.fileName)}
                                  </span>
                                )}
                </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {invoice.customerName && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Müşteri</label>
                                    <p className="text-slate-900 dark:text-white">{invoice.customerName}</p>
              </div>
                                )}
                                {invoice.totalAmount && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tutar</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {Number(invoice.totalAmount).toFixed(2)} {invoice.currency || 'TRY'}
                                    </p>
          </div>
        )}
                                {invoice.invoiceDate && (
                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tarih</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}
                                    </p>
          </div>
        )}
                                {invoice.fileSize && (
                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Boyut</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {(invoice.fileSize / 1024).toFixed(2)} KB
                    </p>
                  </div>
                                )}
                </div>
              </div>
                            <div className="flex items-center gap-2 ml-4">
                              {(() => {
                                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
                                const token = sessionStorage.getItem('authToken') || ''
                                const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
                                
                                const viewUrl = invoice.id 
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl 
                                    ? `${invoice.shareUrl}/download`
                                    : null
                                
                                const downloadUrl = invoice.id
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl
                                    ? `${invoice.shareUrl}/download`
                                    : null

                                if (!viewUrl || !downloadUrl) return null

                                return (
                                  <>
                              <button
                                onClick={() => {
                                        fetch(viewUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            window.open(url, '_blank')
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100)
                                          })
                                          .catch(err => {
                                            console.error('PDF görüntüleme hatası:', err)
                                            alert('PDF görüntülenemedi')
                                          })
                                      }}
                                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Görüntüle"
                                    >
                                      <Eye className="w-4 h-4" />
                              </button>
                      <button
                        onClick={() => {
                                        fetch(downloadUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = fixInvoiceFileName(invoice.fileName) || `fatura-${invoice.id}.pdf`
                                            document.body.appendChild(a)
                                            a.click()
                                            window.URL.revokeObjectURL(url)
                                            document.body.removeChild(a)
                                          })
                                          .catch(err => {
                                            console.error('PDF indirme hatası:', err)
                                            alert('PDF indirilemedi')
                                          })
                                      }}
                                      className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                      title="İndir"
                                    >
                                      <Download className="w-4 h-4" />
                      </button>
                                  </>
                                )
                              })()}
                    </div>
                      </div>
                            </div>
                          ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* JSON Data Modal */}
      <AnimatePresence>
          {showJsonModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowJsonModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-dark-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Code className="w-6 h-6" />
                      JSON Verisi
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Sipariş: {selectedOrder.orderNumber || selectedOrder.externalOrderId}
                    </p>
                  </div>
                  <button
                        onClick={() => {
                      setShowJsonModal(false)
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap break-words">
                    {(() => {
                      try {
                        // orderData varsa onu kullan, yoksa tüm sipariş verisini JSON olarak göster
                        const jsonData = (selectedOrder as any).orderData 
                          ? (typeof (selectedOrder as any).orderData === 'string' 
                              ? JSON.parse((selectedOrder as any).orderData)
                              : (selectedOrder as any).orderData)
                          : selectedOrder
                        
                        return JSON.stringify(jsonData, null, 2)
                      } catch (error) {
                        return `JSON parse hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                      }
                    })()}
                  </pre>
                  </div>
                
                <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                      try {
                        const jsonData = (selectedOrder as any).orderData 
                          ? (typeof (selectedOrder as any).orderData === 'string' 
                              ? JSON.parse((selectedOrder as any).orderData)
                              : (selectedOrder as any).orderData)
                          : selectedOrder
                        
                        if (jsonData) {
                          const jsonString = JSON.stringify(jsonData, null, 2)
                          await navigator.clipboard.writeText(jsonString)
                          alert('JSON verisi panoya kopyalandı!')
                                  }
                                } catch (error) {
                        alert('Kopyalama hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4" />
                    Kopyala
                            </button>
                          </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
